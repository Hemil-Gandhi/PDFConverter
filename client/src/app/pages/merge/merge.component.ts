import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-merge',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  templateUrl: './merge.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class MergeComponent {
  files: File[] = [];
  processing = false;
  error = '';
  success = false;

  constructor(private api: ApiService, private download: DownloadService) {}

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = this.files.length === 1 ? 'Please select at least 2 PDF files to merge.' : '';
    this.success = false;
  }

  merge() {
    if (this.files.length < 2) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.mergePdfs(this.files)
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.download.downloadBlob(blob, `merged_${Date.now()}.pdf`);
          this.success = true;
        },
        error: (err) => {
          this.error = err.error?.error || 'Merge failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch(e) { }
            });
          }
        }
      });
  }
}
