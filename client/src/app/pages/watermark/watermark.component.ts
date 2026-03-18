import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-watermark',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  templateUrl: './watermark.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class WatermarkComponent {
  files: File[] = [];
  text = 'CONFIDENTIAL';
  opacity = 0.15;
  rotation = -45;
  processing = false;
  error = '';
  success = false;

  constructor(private api: ApiService, private download: DownloadService) { }

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = '';
    this.success = false;
  }

  watermark() {
    if (!this.files.length || !this.text) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.watermarkPdf(this.files[0], this.text, this.opacity, this.rotation)
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.download.downloadBlob(blob, `watermarked_${this.files[0].name}`);
          this.success = true;
        },
        error: (err) => {
          this.error = err.error?.error || 'Watermark failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch (e) { }
            });
          }
        }
      });
  }
}
