const { pool } = require('../db');
const bcrypt = require('bcryptjs');

/**
 * Seeds four default players if no users exist yet.
 * Passwords default to the player's username — they should change them on first login.
 */
async function seedPlayers() {
  const { rowCount } = await pool.query('SELECT 1 FROM users LIMIT 1');
  if (rowCount > 0) return;

  const players = [
    { username: 'player1', display_name: 'Player 1' },
    { username: 'player2', display_name: 'Player 2' },
    { username: 'player3', display_name: 'Player 3' },
    { username: 'player4', display_name: 'Player 4' },
  ];

  for (const p of players) {
    const hash = await bcrypt.hash(p.username, 10);
    await pool.query(
      'INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3)',
      [p.username, p.display_name, hash]
    );
  }

  console.log('Seeded 4 default players (username = initial password).');
}

module.exports = { seedPlayers };
