const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const auth = require('../middleware/auth');

// POST /api/deployments
router.post('/', async (req, res) => {
  try {
    const { userId, contractName, contractAddress, txHash, chainId, chainName, abi } = req.body;
    if (!contractAddress || !txHash) return res.status(400).json({ success: false, message: 'Missing fields' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO deployments (id, user_id, contract_name, contract_address, tx_hash, chain_id, chain_name, abi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId || null, contractName || 'Unknown', contractAddress, txHash, chainId || '882022', chainName || 'VDChain', JSON.stringify(abi) || null]
    );

    res.json({ success: true, message: 'Deployment saved', id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/deployments
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM deployments WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, deployments: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/deployments/recent
router.get('/recent', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT contract_name, contract_address, tx_hash, chain_name, created_at FROM deployments ORDER BY created_at DESC LIMIT 20'
    );
    res.json({ success: true, deployments: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
