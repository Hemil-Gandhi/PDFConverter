import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-translate',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  templateUrl: './translate.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class TranslateComponent {
  files: File[] = [];
  targetLanguage = 'es';
  processing = false;
  error = '';
  success = false;

  languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ru', name: 'Russian' },
  ];

  constructor(private api: ApiService, private download: DownloadService) {}

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = '';
    this.success = false;
  }

  translate() {
    if (!this.files.length || !this.targetLanguage) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.translatePdf(this.files[0], this.targetLanguage)
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.download.downloadBlob(blob, `translated_${this.targetLanguage}_${this.files[0].name}`);
          this.success = true;
        },
        error: (err) => {
          this.error = err.error?.error || 'Translation failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch(e) { }
            });
          }
        }
      });
  }
}
