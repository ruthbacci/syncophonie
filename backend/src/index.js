require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const { seedPlayers } = require('./db/seed');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const availabilityRoutes = require('./routes/availability');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/availability', availabilityRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

async function start() {
  await initDb();
  await seedPlayers();
  app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
