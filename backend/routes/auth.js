const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const db = require('../config/db');
require('dotenv').config();

// GET /api/auth/nonce/:wallet
router.get('/nonce/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const nonce = uuidv4();
    const [rows] = await db.query('SELECT * FROM users WHERE wallet_address = ?', [wallet]);

    if (rows.length === 0) {
      await db.query(
        'INSERT INTO users (id, wallet_address, nonce) VALUES (?, ?, ?)',
        [uuidv4(), wallet, nonce]
      );
    } else {
      await db.query('UPDATE users SET nonce = ? WHERE wallet_address = ?', [nonce, wallet]);
    }

    res.json({ success: true, nonce, message: `Sign this message to login to RemixVDscan: ${nonce}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const { wallet, signature } = req.body;
    if (!wallet || !signature) return res.status(400).json({ success: false, message: 'Missing fields' });

    const walletLower = wallet.toLowerCase();
    const [rows] = await db.query('SELECT * FROM users WHERE wallet_address = ?', [walletLower]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const user = rows[0];
    const message = `Sign this message to login to RemixVDscan: ${user.nonce}`;
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();

    if (recovered !== walletLower) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const newNonce = uuidv4();
    await db.query('UPDATE users SET nonce = ? WHERE wallet_address = ?', [newNonce, walletLower]);

    const token = jwt.sign(
      { id: user.id, wallet: walletLower },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    res.json({ success: true, token, user: { id: user.id, wallet: walletLower, username: user.username } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, wallet_address, username, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
