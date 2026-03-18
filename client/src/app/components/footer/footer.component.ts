import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-content">
          <div class="footer-brand">
            <span class="footer-logo">PDF<span class="accent">Converter</span></span>
            <p>Convert, merge, split, compress, and edit PDFs with ease. Your all-in-one document toolkit.</p>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <h4>Convert</h4>
              <a href="/convert">File Converter</a>
              <a href="/convert">PDF to Word</a>
              <a href="/convert">PDF to Image</a>
            </div>
            <div class="footer-col">
              <h4>PDF Tools</h4>
              <a href="/merge">Merge PDF</a>
              <a href="/split">Split PDF</a>
              <a href="/compress">Compress PDF</a>
            </div>
            <div class="footer-col">
              <h4>More</h4>
              <a href="/watermark">Watermark</a>
              <a href="/protect">Protect PDF</a>
              <a href="/organize">Organize</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 PDFConverter. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      padding: 60px 0 0;
      margin-top: 80px;
    }
    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .footer-content {
      display: grid;
      grid-template-columns: 1.5fr 2fr;
      gap: 48px;
      padding-bottom: 40px;
    }
    .footer-brand p {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 12px;
      line-height: 1.7;
    }
    .footer-logo {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .accent {
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .footer-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
    .footer-col h4 {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer-col a {
      display: block;
      font-size: 0.85rem;
      color: var(--text-muted);
      padding: 4px 0;
      transition: color var(--transition-fast);
    }
    .footer-col a:hover { color: var(--accent-primary); }
    .footer-bottom {
      border-top: 1px solid var(--border-color);
      padding: 20px 0;
      text-align: center;
    }
    .footer-bottom p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    @media (max-width: 768px) {
      .footer-content { grid-template-columns: 1fr; gap: 32px; }
      .footer-links { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class FooterComponent {}
