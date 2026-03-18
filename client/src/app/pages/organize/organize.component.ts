import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-organize',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  templateUrl: './organize.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class OrganizeComponent {
  files: File[] = [];
  pageOrder = '';
  processing = false;
  error = '';
  success = false;
  pdfInfo: any = null;

  constructor(private api: ApiService, private download: DownloadService) {}

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = '';
    this.success = false;
    this.pdfInfo = null;
    this.pageOrder = '';

    if (files.length > 0) {
      this.api.getPdfInfo(files[0]).subscribe({
        next: (info) => {
          this.pdfInfo = info;
          // Pre-fill with current order
          this.pageOrder = Array.from({ length: info.pageCount }, (_, i) => i + 1).join(', ');
        },
        error: () => console.warn('Could not load PDF info')
      });
    }
  }

  organize() {
    if (!this.files.length || !this.pageOrder) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.organizePdf(this.files[0], this.pageOrder)
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.download.downloadBlob(blob, `organized_${this.files[0].name}`);
          this.success = true;
        },
        error: (err) => {
          this.error = err.error?.error || 'Organization failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch(e) { }
            });
          }
        }
      });
  }
}
