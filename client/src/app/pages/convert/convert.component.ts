import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';

@Component({
  selector: 'app-convert',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  templateUrl: './convert.component.html',
  styleUrls: ['../shared/tool-page.css']
})
export class ConvertComponent {
  files: File[] = [];
  targetFormat = '';
  processing = false;
  error = '';
  success = false;

  formats = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'docx', label: 'Word (DOCX)', icon: '📝' },
    { value: 'pptx', label: 'PowerPoint (PPTX)', icon: '📊' },
    { value: 'xlsx', label: 'Excel (XLSX)', icon: '📗' },
    { value: 'jpg', label: 'JPG Image', icon: '🖼️' },
    { value: 'png', label: 'PNG Image', icon: '🖼️' },
    { value: 'webp', label: 'WebP Image', icon: '🖼️' },
  ];

  acceptedFormats = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.tiff,.bmp,.txt';

  constructor(private api: ApiService, private download: DownloadService) {}

  onFilesSelected(files: File[]) {
    this.files = files;
    this.error = '';
    this.success = false;
  }

  getInputExt(): string {
    if (!this.files.length) return '';
    return this.download.getFileExtension(this.files[0].name);
  }

  convert() {
    if (!this.files.length || !this.targetFormat) return;
    this.processing = true;
    this.error = '';
    this.success = false;

    this.api.convertFile(this.files[0], this.targetFormat).subscribe({
      next: (blob) => {
        const baseName = this.files[0].name.replace(/\.[^.]+$/, '');
        this.download.downloadBlob(blob, `${baseName}.${this.targetFormat}`);
        this.processing = false;
        this.success = true;
      },
      error: (err) => {
        this.processing = false;
        this.error = err.error?.error || 'Conversion failed. Please try again.';
        // Try to read error from blob
        if (err.error instanceof Blob) {
          err.error.text().then((text: string) => {
            try { this.error = JSON.parse(text).error; } catch(e) { this.error = 'Conversion failed.'; }
          });
        }
      }
    });
  }
}
