require('dotenv').config();
const connectDB = require('./config/db');
const BusinessProfile = require('./models/BusinessProfile');

const SLUGS = ['sharma-vegetables', 'gupta-hardware', 'royal-bakery', 'kumar-mobile-store'];

async function run() {
  await connectDB(process.env.MONGO_URI);
  const res = await BusinessProfile.updateMany(
    { pageSlug: { $in: SLUGS } },
    { $set: { suggested: true } }
  );
  console.log('[init-suggested] matched', res.matchedCount, 'modified', res.modifiedCount);
  const all = await BusinessProfile.find({}, 'shopName pageSlug suggested').lean();
  console.log('[init-suggested] profiles:', JSON.stringify(all));
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[init-suggested] failed:', e.message);
    process.exit(1);
  });
