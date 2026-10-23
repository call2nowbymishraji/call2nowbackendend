// One-off: seeds the categories collection on an existing database (idempotent).
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const DEFAULT_CATEGORIES = require('./utils/defaultCategories');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const n = await Category.countDocuments();
  if (n === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES.map((name, i) => ({ name, order: i + 1 })));
    console.log('[initCategories] inserted', DEFAULT_CATEGORIES.length);
  } else {
    console.log('[initCategories] already present:', n);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error('[initCategories] failed:', e.message);
  process.exit(1);
});
