const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.put('/username', requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }

  const cleaned = username.toLowerCase().trim();
  if (cleaned.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    return res.status(400).json({ error: 'Username may only contain letters, numbers and underscores' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [cleaned, req.user.id]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'That username is already taken' });
    }

    const result = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, display_name',
      [cleaned, req.user.id]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, displayName: user.display_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
