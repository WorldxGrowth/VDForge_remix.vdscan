const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// POST /api/compile
router.post('/', async (req, res) => {
  try {
    const { source, fileName, solcVersion, evmVersion, optimize, userId } = req.body;
    if (!source) return res.status(400).json({ success: false, message: 'Source code required' });

    // Save compile history
    const id = uuidv4();
    await db.query(
      'INSERT INTO compile_history (id, user_id, file_name, solc_version, evm_version, success) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId || null, fileName || 'unknown.sol', solcVersion || '0.8.23', evmVersion || 'shanghai', true]
    );

    res.json({ success: true, message: 'Compile logged', id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/compile/history
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ success: true, history: [] });
    const [rows] = await db.query(
      'SELECT * FROM compile_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
