require('dotenv').config();
const connectDB = require('./config/db');
const BusinessProfile = require('./models/BusinessProfile');

async function run() {
  await connectDB(process.env.MONGO_URI);
  const over = await BusinessProfile.find({}).lean();
  let fixed = 0;
  for (const p of over) {
    if ((p.gallery || []).length > 9) {
      await BusinessProfile.updateOne({ _id: p._id }, { $set: { gallery: p.gallery.slice(0, 9) } });
      fixed++;
      console.log('[trim-gallery] trimmed', p.shopName, 'from', p.gallery.length, 'to 9');
    }
  }
  console.log('[trim-gallery] done, trimmed', fixed);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[trim-gallery] failed:', e.message);
    process.exit(1);
  });
