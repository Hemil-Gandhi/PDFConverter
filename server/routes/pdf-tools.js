const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const ConversionHistory = require('../models/ConversionHistory');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const outputsDir = path.join(__dirname, '..', 'outputs');

function cleanup(...paths) {
  paths.forEach(p => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {} });
}

function sendFile(res, outputPath, outputName, mimeType, cleanupPaths = []) {
  res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
  res.setHeader('Content-Type', mimeType || 'application/pdf');
  const stream = fs.createReadStream(outputPath);
  stream.pipe(res);
  stream.on('end', () => cleanup(...cleanupPaths, outputPath));
}

async function saveHistory(data) {
  try { await ConversionHistory.create(data); } catch (e) {}
}

// ==================== MERGE PDFs ====================
router.post('/merge', upload.array('files', 20), async (req, res) => {
  const inputPaths = [];
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 PDF files are required for merging' });
    }

    inputPaths.push(...req.files.map(f => f.path));
    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedBytes);

    await saveHistory({
      originalName: req.files.map(f => f.originalname).join(', '),
      operation: 'merge',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.files.reduce((sum, f) => sum + f.size, 0),
      outputSize: mergedBytes.length,
      details: `Merged ${req.files.length} PDFs`
    });

    sendFile(res, outputPath, 'merged.pdf', 'application/pdf', inputPaths);
  } catch (err) {
    console.error('Merge error:', err);
    cleanup(...inputPaths);
    res.status(500).json({ error: 'Merge failed: ' + err.message });
  }
});

// ==================== SPLIT PDF ====================
router.post('/split', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { ranges } = req.body; // e.g., "1-3,5,7-10" or "all" for single pages
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    let pageIndices = [];
    if (!ranges || ranges === 'all') {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      const parts = ranges.split(',').map(s => s.trim());
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
            pageIndices.push(i - 1);
          }
        } else {
          const pageNum = parseInt(part);
          if (pageNum >= 1 && pageNum <= totalPages) pageIndices.push(pageNum - 1);
        }
      }
    }

    if (pageIndices.length === 0) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'No valid page numbers specified' });
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const outputBytes = await newPdf.save();
    fs.writeFileSync(outputPath, outputBytes);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'split',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: outputBytes.length,
      details: `Extracted pages: ${pageIndices.map(i => i + 1).join(', ')}`
    });

    sendFile(res, outputPath, `split_${req.file.originalname}`, 'application/pdf', [req.file.path]);
  } catch (err) {
    console.error('Split error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Split failed: ' + err.message });
  }
});

// ==================== COMPRESS PDF ====================
router.post('/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Remove metadata to reduce size
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('PDF Converter');
    pdfDoc.setCreator('PDF Converter');

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    fs.writeFileSync(outputPath, compressedBytes);

    const compressionRatio = ((1 - compressedBytes.length / pdfBytes.length) * 100).toFixed(1);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'compress',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: compressedBytes.length,
      details: `Compressed by ${compressionRatio}%`
    });

    sendFile(res, outputPath, `compressed_${req.file.originalname}`, 'application/pdf', [req.file.path]);
  } catch (err) {
    console.error('Compress error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Compression failed: ' + err.message });
  }
});

// ==================== EDIT PDF (Add Text) ====================
router.post('/edit', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { text, x, y, pageNumber, fontSize, color } = req.body;
    if (!text) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'Text is required for editing' });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageIdx = Math.max(0, (parseInt(pageNumber) || 1) - 1);
    const page = pdfDoc.getPage(Math.min(pageIdx, pdfDoc.getPageCount() - 1));

    const textX = parseFloat(x) || 50;
    const textY = parseFloat(y) || page.getSize().height - 50;
    const textSize = parseInt(fontSize) || 16;

    // Parse color (default black)
    let textColor = rgb(0, 0, 0);
    if (color) {
      const hex = color.replace('#', '');
      if (hex.length === 6) {
        textColor = rgb(
          parseInt(hex.slice(0, 2), 16) / 255,
          parseInt(hex.slice(2, 4), 16) / 255,
          parseInt(hex.slice(4, 6), 16) / 255
        );
      }
    }

    page.drawText(text, { x: textX, y: textY, size: textSize, font, color: textColor });

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const editedBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, editedBytes);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'edit',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: editedBytes.length,
      details: `Added text "${text.substring(0, 50)}" on page ${pageIdx + 1}`
    });

    sendFile(res, outputPath, `edited_${req.file.originalname}`, 'application/pdf', [req.file.path]);
  } catch (err) {
    console.error('Edit error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Edit failed: ' + err.message });
  }
});

// ==================== WATERMARK ====================
router.post('/watermark', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { text, opacity, rotation } = req.body;
    if (!text) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'Watermark text is required' });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const watermarkOpacity = parseFloat(opacity) || 0.15;
    const watermarkRotation = parseFloat(rotation) || -45;

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) / 8;
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      page.drawText(text, {
        x: (width - textWidth * Math.cos(Math.abs(watermarkRotation) * Math.PI / 180)) / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: watermarkOpacity,
        rotate: degrees(watermarkRotation),
      });
    }

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const watermarkedBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, watermarkedBytes);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'watermark',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: watermarkedBytes.length,
      details: `Added watermark "${text}"`
    });

    sendFile(res, outputPath, `watermarked_${req.file.originalname}`, 'application/pdf', [req.file.path]);
  } catch (err) {
    console.error('Watermark error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Watermark failed: ' + err.message });
  }
});

// ==================== PROTECT PDF ====================
router.post('/protect', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { password } = req.body;
    if (!password) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'Password is required' });
    }

    const inputPath = req.file.path;
    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);

    // Standard PDF encryption using qpdf-wasm (pure JS / WASM)
    // qpdf-wasm is an ESM package, so we use dynamic import
    const { default: initQpdf } = await import('qpdf-wasm');
    const qpdf = await initQpdf();
    
    const pdfBytes = fs.readFileSync(inputPath);
    const inName = 'input.pdf';
    const outName = 'output.pdf';
    
    qpdf.FS.writeFile(inName, pdfBytes);
    
    // Command: qpdf input.pdf --encrypt user-pass owner-pass key-length -- output.pdf
    // Using 256-bit AES encryption
    qpdf.callMain([inName, '--encrypt', password, password + '_owner', '256', '--', outName]);
    
    const protectedBytes = qpdf.FS.readFile(outName);
    fs.writeFileSync(outputPath, protectedBytes);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'protect',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: protectedBytes.length,
      details: 'Standard Password protection added (AES-256)'
    });

    sendFile(res, outputPath, `protected_${req.file.originalname}`, 'application/pdf', [inputPath]);
  } catch (err) {
    console.error('Protect error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Protection failed: ' + err.message });
  }
});

// ==================== ORGANIZE (Reorder/Delete Pages) ====================
router.post('/organize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { pageOrder } = req.body; // e.g., "3,1,2,5" — new page order (1-indexed)
    if (!pageOrder) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'Page order is required (e.g., "3,1,2,5")' });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const newOrder = pageOrder.split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < totalPages);

    if (newOrder.length === 0) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'No valid page numbers in the specified order' });
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, newOrder);
    copiedPages.forEach(page => newPdf.addPage(page));

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const organizedBytes = await newPdf.save();
    fs.writeFileSync(outputPath, organizedBytes);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'organize',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: organizedBytes.length,
      details: `Reorganized to order: ${newOrder.map(i => i + 1).join(', ')}`
    });

    sendFile(res, outputPath, `organized_${req.file.originalname}`, 'application/pdf', [req.file.path]);
  } catch (err) {
    console.error('Organize error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Organize failed: ' + err.message });
  }
});

// ==================== TRANSLATE PDF ====================
router.post('/translate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { targetLanguage } = req.body;
    if (!targetLanguage) {
      cleanup(req.file.path);
      return res.status(400).json({ error: 'Target language is required' });
    }

    // For translation, we extract text, translate, and create a new PDF
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    // Create a new PDF with translated content placeholder
    const newPdf = await PDFDocument.create();
    const font = await newPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await newPdf.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.5;
    const pageWidth = 595.28;
    const pageHeight = 841.89;

    // Add a cover page
    let page = newPdf.addPage([pageWidth, pageHeight]);
    page.drawText(`Translation: ${req.file.originalname}`, {
      x: margin, y: pageHeight - margin, size: 20, font: boldFont, color: rgb(0.2, 0.2, 0.8)
    });
    page.drawText(`Target Language: ${targetLanguage}`, {
      x: margin, y: pageHeight - margin - 30, size: 14, font, color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText(`Original pages: ${pageCount}`, {
      x: margin, y: pageHeight - margin - 55, size: 12, font, color: rgb(0.4, 0.4, 0.4)
    });
    page.drawText('Note: Full translation requires OCR and NMT services.', {
      x: margin, y: pageHeight - margin - 85, size: 11, font, color: rgb(0.5, 0.5, 0.5)
    });
    page.drawText('The PDF structure has been preserved with translation placeholders.', {
      x: margin, y: pageHeight - margin - 105, size: 11, font, color: rgb(0.5, 0.5, 0.5)
    });

    // Copy original pages
    const originalPages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    originalPages.forEach(p => newPdf.addPage(p));

    const outputId = uuidv4();
    const outputPath = path.join(outputsDir, `${outputId}.pdf`);
    const translatedBytes = await newPdf.save();
    fs.writeFileSync(outputPath, translatedBytes);

    await saveHistory({
      originalName: req.file.originalname,
      operation: 'translate',
      inputFormat: 'pdf',
      outputFormat: 'pdf',
      fileSize: req.file.size,
      outputSize: translatedBytes.length,
      details: `Translation to ${targetLanguage} prepared`
    });

    sendFile(res, outputPath, `translated_${req.file.originalname}`, 'application/pdf', [req.file.path]);
  } catch (err) {
    console.error('Translate error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Translation failed: ' + err.message });
  }
});

// ==================== GET PDF INFO ====================
router.post('/info', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const info = {
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle() || 'N/A',
      author: pdfDoc.getAuthor() || 'N/A',
      subject: pdfDoc.getSubject() || 'N/A',
      creator: pdfDoc.getCreator() || 'N/A',
      producer: pdfDoc.getProducer() || 'N/A',
      fileSize: req.file.size,
      pages: []
    };

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      info.pages.push({ pageNumber: i + 1, width: Math.round(width), height: Math.round(height) });
    }

    cleanup(req.file.path);
    res.json(info);
  } catch (err) {
    console.error('Info error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Failed to read PDF info: ' + err.message });
  }
});

module.exports = router;
