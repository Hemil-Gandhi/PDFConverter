const express = require('express');
const router = express.Router();
const ConversionHistory = require('../models/ConversionHistory');

// GET /api/history — Get conversion history
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, operation } = req.query;
    const query = operation ? { operation } : {};
    const history = await ConversionHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await ConversionHistory.countDocuments(query);
    res.json({ data: history, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history: ' + err.message });
  }
});

// GET /api/history/stats — Get usage statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await ConversionHistory.countDocuments();
    const byOperation = await ConversionHistory.aggregate([
      { $group: { _id: '$operation', count: { $sum: 1 } } }
    ]);
    const totalSize = await ConversionHistory.aggregate([
      { $group: { _id: null, totalInput: { $sum: '$fileSize' }, totalOutput: { $sum: '$outputSize' } } }
    ]);
    res.json({
      totalConversions: total,
      byOperation: byOperation.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
      totalInputSize: totalSize[0]?.totalInput || 0,
      totalOutputSize: totalSize[0]?.totalOutput || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats: ' + err.message });
  }
});

// DELETE /api/history — Clear history
router.delete('/', async (req, res) => {
  try {
    await ConversionHistory.deleteMany({});
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history: ' + err.message });
  }
});

module.exports = router;
