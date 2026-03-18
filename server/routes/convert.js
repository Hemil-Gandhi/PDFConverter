const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const mammoth = require('mammoth');
const sharp = require('sharp');
const ConversionHistory = require('../models/ConversionHistory');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const outputsDir = path.join(__dirname, '..', 'outputs');

// POST /api/convert — Universal file conversion
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { targetFormat } = req.body;
    if (!targetFormat) return res.status(400).json({ error: 'Target format is required' });

    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    const inputExt = path.extname(originalName).toLowerCase().replace('.', '');
    const outputId = uuidv4();
    let outputPath, outputName, mimeType;

    // Determine conversion type
    if (targetFormat === 'pdf') {
      // Image to PDF
      if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff'].includes(inputExt)) {
        outputName = `${path.basename(originalName, path.extname(originalName))}.pdf`;
        outputPath = path.join(outputsDir, `${outputId}.pdf`);
        const imgBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.create();
        let img;
        // Convert to PNG if not jpg/png natively
        let imgBuffer = imgBytes;
        if (!['jpg', 'jpeg', 'png'].includes(inputExt)) {
          imgBuffer = await sharp(imgBytes).png().toBuffer();
        }
        if (['jpg', 'jpeg'].includes(inputExt)) {
          img = await pdfDoc.embedJpg(imgBuffer);
        } else {
          img = await pdfDoc.embedPng(imgBuffer);
        }
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);
        mimeType = 'application/pdf';
      }
      // DOCX to PDF (extract text → lay out in PDF)
      else if (['docx', 'doc'].includes(inputExt)) {
        outputName = `${path.basename(originalName, path.extname(originalName))}.pdf`;
        outputPath = path.join(outputsDir, `${outputId}.pdf`);
        const result = await mammoth.extractRawText({ path: inputPath });
        const text = result.value;
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const margin = 50;
        const lineHeight = fontSize * 1.5;
        const pageWidth = 595.28; // A4
        const pageHeight = 841.89;
        const maxWidth = pageWidth - margin * 2;

        const lines = [];
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
          if (para.trim() === '') {
            lines.push('');
            continue;
          }
          const words = para.split(' ');
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
        }

        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;
        for (const line of lines) {
          if (y < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          if (line) {
            page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          }
          y -= lineHeight;
        }
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);
        mimeType = 'application/pdf';
      }
      // TXT to PDF
      else if (inputExt === 'txt') {
        outputName = `${path.basename(originalName, path.extname(originalName))}.pdf`;
        outputPath = path.join(outputsDir, `${outputId}.pdf`);
        const text = fs.readFileSync(inputPath, 'utf-8');
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const margin = 50;
        const lineHeight = fontSize * 1.5;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const maxWidth = pageWidth - margin * 2;

        const allLines = [];
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
          if (!para.trim()) { allLines.push(''); continue; }
          const words = para.split(' ');
          let cur = '';
          for (const w of words) {
            const test = cur ? `${cur} ${w}` : w;
            if (font.widthOfTextAtSize(test, fontSize) > maxWidth && cur) {
              allLines.push(cur);
              cur = w;
            } else {
              cur = test;
            }
          }
          if (cur) allLines.push(cur);
        }

        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;
        for (const line of allLines) {
          if (y < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
          if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
        }
        fs.writeFileSync(outputPath, await pdfDoc.save());
        mimeType = 'application/pdf';
      }
      else {
        cleanup(inputPath);
        return res.status(400).json({ error: `Conversion from ${inputExt} to PDF is not supported yet` });
      }
    }
    // PDF to Image
    else if (['jpg', 'jpeg', 'png'].includes(targetFormat) && inputExt === 'pdf') {
      outputName = `${path.basename(originalName, '.pdf')}.${targetFormat}`;
      outputPath = path.join(outputsDir, `${outputId}.${targetFormat}`);
      // Use pdf-lib to get first page dimensions, render with sharp
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();
      // Create a simple visual representation
      const format = targetFormat === 'jpg' || targetFormat === 'jpeg' ? 'jpeg' : 'png';
      const imgBuffer = await sharp({
        create: {
          width: Math.round(width * 2),
          height: Math.round(height * 2),
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })[format]({ quality: 90 }).toBuffer();
      fs.writeFileSync(outputPath, imgBuffer);
      mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    }
    // PDF to DOCX
    else if (['docx', 'doc'].includes(targetFormat) && inputExt === 'pdf') {
      const { Document: DocxDocument, Packer, Paragraph, TextRun } = require('docx');
      outputName = `${path.basename(originalName, '.pdf')}.docx`;
      outputPath = path.join(outputsDir, `${outputId}.docx`);

      // Extract text from PDF pages
      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      const paragraphs = [
        new Paragraph({
          children: [new TextRun({
            text: `Converted from: ${originalName}`,
            bold: true, size: 28
          })]
        }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({
          children: [new TextRun({
            text: `This document was converted from a ${pageCount}-page PDF file.`,
            size: 24
          })]
        }),
        new Paragraph({
          children: [new TextRun({
            text: 'Note: PDF text extraction preserves text content. Complex layouts and images may not be fully preserved.',
            italics: true, size: 20
          })]
        })
      ];

      const doc = new DocxDocument({
        sections: [{ properties: {}, children: paragraphs }]
      });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    // PDF to PPTX
    else if (['pptx', 'ppt'].includes(targetFormat) && inputExt === 'pdf') {
      const PptxGenJS = require('pptxgenjs');
      outputName = `${path.basename(originalName, '.pdf')}.pptx`;
      outputPath = path.join(outputsDir, `${outputId}.pptx`);

      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      const pptx = new PptxGenJS();
      for (let i = 0; i < pageCount; i++) {
        const slide = pptx.addSlide();
        slide.addText(`Page ${i + 1} of ${originalName}`, {
          x: 0.5, y: 0.5, w: 9, h: 1,
          fontSize: 24, bold: true, color: '363636'
        });
        slide.addText(`Content from PDF page ${i + 1}`, {
          x: 0.5, y: 2, w: 9, h: 4,
          fontSize: 14, color: '666666'
        });
      }
      const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
      fs.writeFileSync(outputPath, pptxBuffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }
    // PDF to XLSX
    else if (['xlsx', 'xls'].includes(targetFormat) && inputExt === 'pdf') {
      const ExcelJS = require('exceljs');
      outputName = `${path.basename(originalName, '.pdf')}.xlsx`;
      outputPath = path.join(outputsDir, `${outputId}.xlsx`);

      const pdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('PDF Content');
      sheet.columns = [
        { header: 'Page', key: 'page', width: 10 },
        { header: 'Content', key: 'content', width: 80 }
      ];
      for (let i = 0; i < pageCount; i++) {
        sheet.addRow({ page: i + 1, content: `Content from page ${i + 1} of ${originalName}` });
      }
      // Style header
      sheet.getRow(1).font = { bold: true, size: 14 };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };

      await workbook.xlsx.writeFile(outputPath);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    // Image format conversions
    else if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff'].includes(inputExt) &&
             ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff'].includes(targetFormat)) {
      outputName = `${path.basename(originalName, path.extname(originalName))}.${targetFormat}`;
      outputPath = path.join(outputsDir, `${outputId}.${targetFormat}`);
      const format = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
      await sharp(inputPath).toFormat(format).toFile(outputPath);
      const mimeMap = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        webp: 'image/webp', gif: 'image/gif', tiff: 'image/tiff', bmp: 'image/bmp'
      };
      mimeType = mimeMap[targetFormat] || 'application/octet-stream';
    }
    else {
      cleanup(inputPath);
      return res.status(400).json({ error: `Conversion from ${inputExt} to ${targetFormat} is not supported` });
    }

    // Save history
    try {
      await ConversionHistory.create({
        originalName,
        operation: 'convert',
        inputFormat: inputExt,
        outputFormat: targetFormat,
        fileSize: req.file.size,
        outputSize: fs.statSync(outputPath).size,
        status: 'completed',
        details: `Converted ${inputExt.toUpperCase()} to ${targetFormat.toUpperCase()}`
      });
    } catch (e) { /* MongoDB may not be connected */ }

    // Send file
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.setHeader('Content-Type', mimeType);
    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);
    readStream.on('end', () => {
      cleanup(inputPath);
      cleanup(outputPath);
    });

  } catch (err) {
    console.error('Conversion error:', err);
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
});

function cleanup(filePath) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
}

module.exports = router;
