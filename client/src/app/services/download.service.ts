import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  getAcceptString(formats: string[]): string {
    const mimeMap: Record<string, string> = {
      pdf: '.pdf',
      doc: '.doc',
      docx: '.docx',
      ppt: '.ppt',
      pptx: '.pptx',
      xls: '.xls',
      xlsx: '.xlsx',
      jpg: '.jpg,.jpeg',
      jpeg: '.jpeg,.jpg',
      png: '.png',
      webp: '.webp',
      gif: '.gif',
      tiff: '.tiff,.tif',
      bmp: '.bmp',
      txt: '.txt'
    };
    return formats.map(f => mimeMap[f] || `.${f}`).join(',');
  }
}
