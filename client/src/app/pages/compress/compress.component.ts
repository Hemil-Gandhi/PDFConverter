import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-compress',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  templateUrl: './compress.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class CompressComponent {
  files: File[] = [];
  processing = false;
  error = '';
  success = false;
  savedSize = '';

  constructor(private api: ApiService, private download: DownloadService) {}

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = '';
    this.success = false;
  }

  formatSize(bytes: number) {
    return this.download.formatFileSize(bytes);
  }

  compress() {
    if (!this.files.length) return;
    this.processing = true;
    this.error = '';
    this.success = false;
    
    const originalSize = this.files[0].size;

    this.api.compressPdf(this.files[0])
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.savedSize = this.formatSize(Math.max(0, originalSize - blob.size));
          this.download.downloadBlob(blob, `compressed_${this.files[0].name}`);
          this.success = true;
        },
        error: (err) => {
          this.error = 'Compression failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch(e) { }
            });
          }
        }
      });
  }
}
