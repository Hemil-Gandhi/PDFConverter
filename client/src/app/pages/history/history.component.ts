import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { DownloadService } from '../../services/download.service';

interface HistoryItem {
  _id: string;
  originalName: string;
  operation: string;
  inputFormat: string;
  outputFormat: string;
  fileSize: number;
  outputSize: number;
  status: string;
  details: string;
  createdAt: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  Object = Object;
  history: HistoryItem[] = [];
  stats: any = null;
  loading = true;
  error = '';
  page = 1;
  hasMore = true;

  constructor(private api: ApiService, private download: DownloadService) {}

  ngOnInit() {
    this.loadStats();
    this.loadHistory();
  }

  loadStats() {
    this.api.getStats().subscribe({
      next: (data) => this.stats = data,
      error: () => console.warn('Could not load stats')
    });
  }

  loadHistory(append = false) {
    if (!append) this.loading = true;
    
    this.api.getHistory(this.page, 15).subscribe({
      next: (res) => {
        if (append) {
          this.history = [...this.history, ...res.data];
        } else {
          this.history = res.data;
        }
        this.hasMore = this.history.length < res.total;
        this.loading = false;
        this.error = '';
      },
      error: (err) => {
        this.error = 'Failed to load history';
        this.loading = false;
        console.error('History load error:', err);
      }
    });
  }

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.page++;
    this.loadHistory(true);
  }

  clearHistory() {
    if (!confirm('Are you sure you want to clear your entire conversion history?')) return;
    
    this.api.clearHistory().subscribe({
      next: () => {
        this.history = [];
        this.stats = null;
        this.hasMore = false;
        this.loadStats();
      },
      error: () => alert('Failed to clear history')
    });
  }

  formatSize(bytes: number) {
    return this.download.formatFileSize(bytes);
  }

  formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }

  getOperationIcon(op: string) {
    const icons: Record<string, string> = {
      convert: '🔄', merge: '📎', split: '✂️', compress: '📦',
      edit: '✏️', watermark: '💧', protect: '🔒', organize: '📑', translate: '🌐'
    };
    return icons[op] || '📄';
  }

  getOperationColor(op: string) {
    const colors: Record<string, string> = {
      convert: '#6366f1', merge: '#8b5cf6', split: '#ec4899', compress: '#14b8a6',
      edit: '#f59e0b', watermark: '#3b82f6', protect: '#10b981', organize: '#f97316', translate: '#06b6d4'
    };
    return colors[op] || '#64748b';
  }
}
