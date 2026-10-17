require('dotenv').config();
const connectDB = require('./config/db');
const PromoSlide = require('./models/PromoSlide');
const Ad = require('./models/Ad');

const clean = (s) => (typeof s === 'string' ? s.replace(/\s*[—–]\s*/g, ': ').replace(/\s{2,}/g, ' ').trim() : s);

async function run() {
  await connectDB(process.env.MONGO_URI);

  const slides = await PromoSlide.find({});
  let sc = 0;
  for (const s of slides) {
    const t = clean(s.title);
    const sub = clean(s.subtitle);
    if (t !== s.title || sub !== s.subtitle) {
      s.title = t;
      s.subtitle = sub;
      await s.save();
      sc++;
    }
  }
  console.log('[clean-dashes] slides updated', sc, 'of', slides.length);

  const ads = await Ad.find({});
  let ac = 0;
  for (const a of ads) {
    const t = clean(a.title);
    const sub = clean(a.subtitle);
    if (t !== a.title || sub !== a.subtitle) {
      a.title = t;
      a.subtitle = sub;
      await a.save();
      ac++;
    }
  }
  console.log('[clean-dashes] ads updated', ac, 'of', ads.length);

  const afterSlides = await PromoSlide.find({}, 'title subtitle').lean();
  const afterAds = await Ad.find({}, 'title subtitle').lean();
  console.log('[clean-dashes] slides now:', JSON.stringify(afterSlides));
  console.log('[clean-dashes] ads now:', JSON.stringify(afterAds));
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[clean-dashes] failed:', e.message);
    process.exit(1);
  });
