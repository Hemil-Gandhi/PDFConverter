import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  templateUrl: './edit.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class EditComponent {
  files: File[] = [];
  processing = false;
  error = '';
  success = false;

  text = '';
  pageNumber = 1;
  x = 50;
  y = 50;
  fontSize = 16;
  color = '#000000';

  constructor(private api: ApiService, private download: DownloadService) { }

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = '';
    this.success = false;
  }

  edit() {
    if (!this.files.length || !this.text) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.editPdf(this.files[0], {
      text: this.text,
      pageNumber: this.pageNumber,
      x: this.x,
      y: this.y,
      fontSize: this.fontSize,
      color: this.color
    })
      .pipe(finalize(() => this.processing = false))
      .subscribe({
        next: (blob) => {
          this.processing = false;
          this.download.downloadBlob(blob, `edited_${this.files[0].name}`);
          this.success = true;
        },
        error: (err) => {
          this.error = err.error?.error || 'Edit failed. Please try again.';
          if (err.error instanceof Blob) {
            err.error.text().then((text: string) => {
              try { this.error = JSON.parse(text).error; } catch (e) { }
            });
          }
        }
      });
  }
}
