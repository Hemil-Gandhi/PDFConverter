const mongoose = require('mongoose');

const conversionHistorySchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  operation: { type: String, required: true, enum: [
    'convert', 'merge', 'split', 'compress', 'edit',
    'watermark', 'protect', 'organize', 'translate'
  ]},
  inputFormat: { type: String },
  outputFormat: { type: String },
  fileSize: { type: Number },
  outputSize: { type: Number },
  status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  details: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConversionHistory', conversionHistorySchema);
