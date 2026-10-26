require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (IS_PROD) {
    // Booting with a shared guessable secret would let anyone mint valid login tokens.
    console.error('[config] JWT_SECRET is not set. Refusing to start in production.');
    process.exit(1);
  }
  console.warn('[config] JWT_SECRET not set — using dev fallback. Set it in server/.env for production.');
  process.env.JWT_SECRET = 'call2now-dev-secret-change-me';
} else if (IS_PROD && process.env.JWT_SECRET.length < 32) {
  console.error('[config] JWT_SECRET is shorter than 32 characters. Refusing to start in production.');
  process.exit(1);
}

// CORS_ORIGINS is a comma separated list of frontend origins that may call this API.
// The fallback list keeps the current Netlify site and local Vite ports working.
const DEFAULT_ORIGINS = [
  'https://call2now.com',
  'https://www.call2now.com',
  'https://heartfelt-tartufo-898363.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];
const IS_DEV_ORIGIN = (origin) => /^localhost|^127\.|:517\d/.test(origin);
const CONFIGURED_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : null;
const ALLOWED_ORIGINS = new Set(
  (CONFIGURED_ORIGINS || DEFAULT_ORIGINS)
    .map((o) => o.trim().replace(/\/+$/, ''))
    // Production hosts do not need the local Vite ports. Dropping them here means the
    // deployed app boots correctly with the built in list, without weakening the rule below
    // that rejects a developer who explicitly configures one.
    .filter((o) => o && (!IS_PROD || !IS_DEV_ORIGIN(o)))
);
if (IS_PROD && CONFIGURED_ORIGINS) {
  for (const raw of CONFIGURED_ORIGINS) {
    const origin = raw.trim().replace(/\/+$/, '');
    if (IS_DEV_ORIGIN(origin)) {
      console.error(`[config] Refusing to start: dev origin "${origin}" is not allowed in production.`);
      process.exit(1);
    }
  }
  if (!ALLOWED_ORIGINS.size) {
    console.error('[config] Refusing to start: CORS_ORIGINS contains no usable origin.');
    process.exit(1);
  }
}

const app = express();
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header means a non-browser caller (curl, health checks, server to server).
      if (!origin) return cb(null, true);
      const clean = origin.replace(/\/+$/, '');
      if (ALLOWED_ORIGINS.has(clean)) return cb(null, true);
      if (!IS_PROD && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) return cb(null, true);
      // Skipping the header makes the browser block the response; answering 500 here would
      // only add noise to the logs for what is a client-side policy decision.
      return cb(null, false);
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/search', require('./routes/search'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/geo', require('./routes/geo'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/seo', require('./routes/seo'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err.stack || err.message);
    return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err.message);
  res.status(status).json({ message: err.message || 'Bad request' });
});

// Last resort: a rejection that escapes a handler must not take the whole API
// down with it.
process.on('unhandledRejection', (err) => console.error('[fatal] unhandled rejection:', err?.stack || err));

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
