import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DownloadService } from '../../services/download.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  @Input() accept: string = '*';
  @Input() multiple: boolean = false;
  @Input() maxSizeMB: number = 50;
  @Input() label: string = 'Drop your files here';
  @Input() sublabel: string = 'or click to browse';
  @Output() filesSelected = new EventEmitter<File[]>();

  files: File[] = [];
  isDragging = false;
  error = '';

  constructor(private downloadService: DownloadService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.handleFiles(Array.from(droppedFiles));
    }
  }

  onFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
    input.value = '';
  }

  handleFiles(newFiles: File[]) {
    this.error = '';
    const maxBytes = this.maxSizeMB * 1024 * 1024;
    for (const file of newFiles) {
      if (file.size > maxBytes) {
        this.error = `File "${file.name}" exceeds the ${this.maxSizeMB}MB limit`;
        return;
      }
    }
    if (this.multiple) {
      this.files = [...this.files, ...newFiles];
    } else {
      this.files = [newFiles[0]];
    }
    this.filesSelected.emit(this.files);
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.filesSelected.emit(this.files);
  }

  clearFiles() {
    this.files = [];
    this.error = '';
    this.filesSelected.emit(this.files);
  }

  formatSize(bytes: number): string {
    return this.downloadService.formatFileSize(bytes);
  }

  getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊',
      xls: '📗', xlsx: '📗', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
      gif: '🎞️', webp: '🖼️', txt: '📃', csv: '📋'
    };
    return icons[ext || ''] || '📁';
  }
}
