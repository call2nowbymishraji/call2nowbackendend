// One-off: swaps the old unique email index for a sparse one so mobile accounts, which
// carry no email, can coexist. Dry run by default; pass --apply to write.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  const APPLY = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/call2now');
  const before = await User.collection.indexes();
  console.log('[migrate] indexes before:\n  ' + before.map((i) => `${i.name} ${JSON.stringify(i)}`).join('\n  '));
  if (!APPLY) {
    console.log('[migrate] dry run only. Re-run with --apply to drop email_1 and rebuild indexes from the schema.');
    return mongoose.disconnect();
  }
  if (before.some((i) => i.name === 'email_1')) {
    await User.collection.dropIndex('email_1');
    console.log('[migrate] dropped email_1');
  }
  const after = await User.syncIndexes();
  console.log('[migrate] indexes after: ' + after.map((i) => i.name).join(', '));
  await mongoose.disconnect();
})().catch((e) => {
  console.error('[migrate] failed:', e.message);
  process.exit(1);
});
