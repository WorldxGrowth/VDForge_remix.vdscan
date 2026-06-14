const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/projects
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const id = uuidv4();
    await db.query(
      'INSERT INTO projects (id, user_id, name, description) VALUES (?, ?, ?, ?)',
      [id, req.user.id, name, description || null]
    );
    const fileId = uuidv4();
    await db.query(
      'INSERT INTO files (id, project_id, name, content) VALUES (?, ?, ?, ?)',
      [fileId, id, 'Contract.sol', '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.23;\n\ncontract MyContract {\n\n}']
    );
    res.json({ success: true, project: { id, name, description } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
