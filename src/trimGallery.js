require('dotenv').config();
const connectDB = require('./config/db');
const BusinessProfile = require('./models/BusinessProfile');

const MAX_GALLERY = 5;
// Deletion is not reversible, so the script lists what it would cut until --apply is passed.
const APPLY = process.argv.includes('--apply');

async function run() {
  await connectDB(process.env.MONGO_URI);
  const affected = (await BusinessProfile.find({}).lean()).filter((p) => (p.gallery || []).length > MAX_GALLERY);
  for (const p of affected) {
    const lost = p.gallery.length - MAX_GALLERY;
    if (APPLY) await BusinessProfile.updateOne({ _id: p._id }, { $set: { gallery: p.gallery.slice(0, MAX_GALLERY) } });
    console.log(`[trim-gallery] ${APPLY ? 'trimmed' : 'would trim'} ${p.shopName} from ${p.gallery.length} to ${MAX_GALLERY} (${lost} photo(s) dropped)`);
  }
  console.log(APPLY ? `[trim-gallery] done, trimmed ${affected.length}` : `[trim-gallery] dry run, ${affected.length} profile(s) affected. Re-run with --apply to change data.`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[trim-gallery] failed:', e.message);
    process.exit(1);
  });
