const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/availability/me?month=YYYY-MM
 * Returns the logged-in user's availability for a given month.
 */
router.get('/me', requireAuth, async (req, res) => {
  const { month } = req.query; // e.g. "2025-08"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month query param must be YYYY-MM' });
  }

  try {
    const result = await pool.query(
      `SELECT date, period, is_available
       FROM availability
       WHERE user_id = $1
         AND date >= ($2 || '-01')::date
         AND date <  (($2 || '-01')::date + INTERVAL '1 month')
       ORDER BY date, period`,
      [req.user.id, month]
    );
    res.json(result.rows.map(r => ({
      date: r.date.toISOString().slice(0, 10),
      period: r.period,
      isAvailable: r.is_available,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/availability
 * Body: { date: "YYYY-MM-DD", period: "morning"|"afternoon", isAvailable: boolean }
 * Upserts a single slot for the logged-in user.
 */
router.put('/', requireAuth, async (req, res) => {
  const { date, period, isAvailable } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }
  if (!['morning', 'afternoon'].includes(period)) {
    return res.status(400).json({ error: 'period must be morning or afternoon' });
  }
  if (typeof isAvailable !== 'boolean') {
    return res.status(400).json({ error: 'isAvailable must be a boolean' });
  }

  try {
    await pool.query(
      `INSERT INTO availability (user_id, date, period, is_available, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, date, period)
       DO UPDATE SET is_available = EXCLUDED.is_available, updated_at = NOW()`,
      [req.user.id, date, period, isAvailable]
    );
    res.json({ date, period, isAvailable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/availability/group?month=YYYY-MM
 * Returns all players' availability for the month, grouped by user.
 */
router.get('/group', requireAuth, async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month query param must be YYYY-MM' });
  }

  try {
    const result = await pool.query(
      `SELECT u.id AS user_id, u.display_name, a.date, a.period, a.is_available
       FROM users u
       LEFT JOIN availability a
         ON a.user_id = u.id
         AND a.date >= ($1 || '-01')::date
         AND a.date <  (($1 || '-01')::date + INTERVAL '1 month')
       ORDER BY u.id, a.date, a.period`,
      [month]
    );

    // Group by userId
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.user_id]) {
        grouped[row.user_id] = { userId: row.user_id, displayName: row.display_name, slots: [] };
      }
      if (row.date) {
        grouped[row.user_id].slots.push({
          date: row.date.toISOString().slice(0, 10),
          period: row.period,
          isAvailable: row.is_available,
        });
      }
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
