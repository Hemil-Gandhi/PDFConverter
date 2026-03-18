import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-split',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  templateUrl: './split.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class SplitComponent {
  files: File[] = [];
  ranges: string = 'all';
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
    
    if (files.length > 0) {
      this.api.getPdfInfo(files[0]).subscribe({
        next: (info) => this.pdfInfo = info,
        error: () => console.warn('Could not load PDF info')
      });
    }
  }

  split() {
    if (!this.files.length) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.splitPdf(this.files[0], this.ranges)
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.download.downloadBlob(blob, `split_${this.files[0].name}`);
          this.success = true;
        },
        error: (err) => {
          this.error = err.error?.error || 'Split failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch(e) { }
            });
          }
        }
      });
  }
}
