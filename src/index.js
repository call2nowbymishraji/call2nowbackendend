require('dotenv').config();
if (!process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET not set — using dev fallback. Set it in server/.env for production.');
  process.env.JWT_SECRET = 'call2now-dev-secret-change-me';
}
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/search', require('./routes/search'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/call2now')
  .then(() => {
    app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('[db] connection failed:', e.message);
    process.exit(1);
  });

module.exports = app;
