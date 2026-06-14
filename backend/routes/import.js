const express = require('express');
const router = express.Router();

// POST /api/import
// Body: { url: "https://raw.githubusercontent.com/..." }
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL required' });

    // Only allow HTTPS
    if (!url.startsWith('https://')) {
      return res.status(400).json({ success: false, message: 'Only HTTPS URLs allowed' });
    }

    // Fetch the file
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VDForge-IDE/1.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(400).json({ success: false, message: `Fetch failed: ${response.status} ${response.statusText}` });
    }

    const content = await response.text();

    // Get filename from URL
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1];
    if (!fileName.endsWith('.sol')) fileName = fileName + '.sol';

    res.json({ success: true, content, fileName, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
