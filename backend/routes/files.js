const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/files/:projectId
router.get('/:projectId', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM files WHERE project_id = ? ORDER BY type DESC, folder_path ASC, name ASC',
      [req.params.projectId]
    );
    res.json({ success: true, files: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/files
router.post('/', auth, async (req, res) => {
  try {
    const { project_id, name, content, folder_path, type } = req.body;
    if (!project_id || !name) return res.status(400).json({ success: false, message: 'Missing fields' });
    const id = uuidv4();
    const itemType = type || 'file';
    const path = folder_path || '';
    await db.query(
      'INSERT INTO files (id, project_id, name, folder_path, type, content) VALUES (?, ?, ?, ?, ?, ?)',
      [id, project_id, name, path, itemType, content || '']
    );
    res.json({ success: true, file: { id, project_id, name, folder_path: path, type: itemType, content: content || '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/files/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { content, name, folder_path } = req.body;
    await db.query(
      'UPDATE files SET content = COALESCE(?, content), name = COALESCE(?, name), folder_path = COALESCE(?, folder_path) WHERE id = ?',
      [content ?? null, name || null, folder_path ?? null, req.params.id]
    );
    res.json({ success: true, message: 'File saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/files/:id  (also deletes children if folder)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Get the item first
    const [rows] = await db.query('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].type === 'folder') {
      const folderPath = rows[0].folder_path
        ? `${rows[0].folder_path}/${rows[0].name}`
        : rows[0].name;
      // Delete all children
      await db.query(
        'DELETE FROM files WHERE project_id = ? AND (folder_path = ? OR folder_path LIKE ?)',
        [rows[0].project_id, folderPath, `${folderPath}/%`]
      );
    }
    await db.query('DELETE FROM files WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
