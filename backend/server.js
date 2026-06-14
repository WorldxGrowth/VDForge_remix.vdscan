const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4011'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ── Rate Limit ──────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// ── Routes ──────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/files',       require('./routes/files'));
app.use('/api/compile',     require('./routes/compile'));
app.use('/api/deployments', require('./routes/deployments'));
app.use('/api/import',      require('./routes/import'));

// ── Health Check ────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'RemixVDscan API running', port: process.env.PORT });
});

// ── 404 ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────
app.listen(process.env.PORT, () => {
  console.log(`RemixVDscan Backend running on port ${process.env.PORT}`);
});
