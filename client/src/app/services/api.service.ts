import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // File Conversion
  convertFile(file: File, targetFormat: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);
    return this.http.post(`${this.baseUrl}/convert`, formData, { responseType: 'blob' });
  }

  // Merge PDFs
  mergePdfs(files: File[]): Observable<Blob> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post(`${this.baseUrl}/pdf/merge`, formData, { responseType: 'blob' });
  }

  // Split PDF
  splitPdf(file: File, ranges: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ranges', ranges);
    return this.http.post(`${this.baseUrl}/pdf/split`, formData, { responseType: 'blob' });
  }

  // Compress PDF
  compressPdf(file: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/pdf/compress`, formData, { responseType: 'blob' });
  }

  // Edit PDF
  editPdf(file: File, options: { text: string; x?: number; y?: number; pageNumber?: number; fontSize?: number; color?: string }): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('text', options.text);
    if (options.x) formData.append('x', options.x.toString());
    if (options.y) formData.append('y', options.y.toString());
    if (options.pageNumber) formData.append('pageNumber', options.pageNumber.toString());
    if (options.fontSize) formData.append('fontSize', options.fontSize.toString());
    if (options.color) formData.append('color', options.color);
    return this.http.post(`${this.baseUrl}/pdf/edit`, formData, { responseType: 'blob' });
  }

  // Watermark PDF
  watermarkPdf(file: File, text: string, opacity?: number, rotation?: number): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('text', text);
    if (opacity !== undefined) formData.append('opacity', opacity.toString());
    if (rotation !== undefined) formData.append('rotation', rotation.toString());
    return this.http.post(`${this.baseUrl}/pdf/watermark`, formData, { responseType: 'blob' });
  }

  // Protect PDF
  protectPdf(file: File, password: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);
    return this.http.post(`${this.baseUrl}/pdf/protect`, formData, { responseType: 'blob' });
  }

  // Organize PDF
  organizePdf(file: File, pageOrder: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pageOrder', pageOrder);
    return this.http.post(`${this.baseUrl}/pdf/organize`, formData, { responseType: 'blob' });
  }

  // Translate PDF
  translatePdf(file: File, targetLanguage: string): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetLanguage', targetLanguage);
    return this.http.post(`${this.baseUrl}/pdf/translate`, formData, { responseType: 'blob' });
  }

  // PDF Info
  getPdfInfo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/pdf/info`, formData);
  }

  // History
  getHistory(page: number = 1, limit: number = 20): Observable<any> {
    return this.http.get(`${this.baseUrl}/history?page=${page}&limit=${limit}`);
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/history/stats`);
  }

  clearHistory(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/history`);
  }

  // Health
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }
}
