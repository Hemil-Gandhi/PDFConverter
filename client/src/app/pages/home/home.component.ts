import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Tool {
  name: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  searchQuery = '';
  activeCategory = 'all';

  tools: Tool[] = [
    { name: 'File Converter', description: 'Convert between PDF, Word, Excel, PowerPoint, images and more', icon: '🔄', route: '/convert', color: '#6366f1', category: 'convert' },
    { name: 'Merge PDF', description: 'Combine multiple PDF files into a single document', icon: '📎', route: '/merge', color: '#8b5cf6', category: 'pdf' },
    { name: 'Split PDF', description: 'Extract specific pages or split PDF into multiple files', icon: '✂️', route: '/split', color: '#ec4899', category: 'pdf' },
    { name: 'Compress PDF', description: 'Reduce PDF file size while maintaining quality', icon: '📦', route: '/compress', color: '#14b8a6', category: 'pdf' },
    { name: 'Edit PDF', description: 'Add text, annotations, and highlights to your PDF', icon: '✏️', route: '/edit', color: '#f59e0b', category: 'pdf' },
    { name: 'Watermark', description: 'Add or remove watermark text from PDF pages', icon: '💧', route: '/watermark', color: '#3b82f6', category: 'pdf' },
    { name: 'Protect PDF', description: 'Secure your PDF with password encryption', icon: '🔒', route: '/protect', color: '#10b981', category: 'pdf' },
    { name: 'Organize Pages', description: 'Reorder, rotate, and delete pages in your PDF', icon: '📑', route: '/organize', color: '#f97316', category: 'pdf' },
    { name: 'Translate PDF', description: 'Translate PDF content to different languages', icon: '🌐', route: '/translate', color: '#06b6d4', category: 'other' },
    { name: 'Conversion History', description: 'View your past conversions and downloads', icon: '📋', route: '/history', color: '#64748b', category: 'other' },
  ];

  categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'convert', label: 'Convert' },
    { id: 'pdf', label: 'PDF Tools' },
    { id: 'other', label: 'Other' }
  ];

  get filteredTools(): Tool[] {
    return this.tools.filter(tool => {
      const matchesSearch = !this.searchQuery ||
        tool.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.activeCategory === 'all' || tool.category === this.activeCategory;
      return matchesSearch && matchesCategory;
    });
  }

  setCategory(category: string) {
    this.activeCategory = category;
  }
}
