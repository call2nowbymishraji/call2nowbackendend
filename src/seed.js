require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const BusinessProfile = require('./models/BusinessProfile');
const PromoSlide = require('./models/PromoSlide');
const Ad = require('./models/Ad');
const { slugify } = require('./utils/slug');

const SAMPLES = [
  {
    shopName: 'Sharma Vegetables',
    category: 'Vegetables & Fruits',
    ownerName: 'Ramesh Sharma',
    phone: '9876543210',
    address: 'Shop 12, Sarafa Market, Indore, MP',
    description: 'Fresh farm vegetables delivered daily. Wholesale and retail rates for households, hotels and caterers.',
    inMarketSince: 2005,
    onlineDelivery: true,
    panIndia: false,
    products: [
      { name: 'Tomato (1kg)', price: 40, discountedPrice: 32, description: 'Farm fresh hybrid tomatoes, hand picked every morning.' },
      { name: 'Potato (1kg)', price: 30, discountedPrice: null, description: 'Best quality potatoes suitable for all Indian cooking.' },
      { name: 'Onion (1kg)', price: 35, discountedPrice: 28, description: 'Nashik onions, firm and long lasting.' },
    ],
    promoDays: 30,
  },
  {
    shopName: 'Gupta Hardware',
    category: 'Hardware & Paints',
    ownerName: 'Anil Gupta',
    phone: '9876501234',
    address: 'Main Road, Vijay Nagar, Indore, MP',
    description: 'Complete hardware, tools and paint solutions under one roof. Contractor deals welcome.',
    inMarketSince: 1998,
    onlineDelivery: false,
    panIndia: false,
    products: [
      { name: 'Hammer', price: 250, discountedPrice: 199, description: 'Heavy duty fibre handle claw hammer, 500g.' },
      { name: 'Screwdriver Set', price: 450, discountedPrice: null, description: '6 piece precision screwdriver set with magnetic tips.' },
      { name: 'PVC Pipe (10ft)', price: 320, discountedPrice: 290, description: 'ISI marked 1 inch PVC pipe for plumbing.' },
    ],
    promoDays: 0,
  },
  {
    shopName: 'Royal Bakery',
    category: 'Bakery & Sweets',
    ownerName: 'Imran Khan',
    phone: '9898989898',
    address: 'Palasia Square, Indore, MP',
    description: 'Fresh cakes, pastries and biscuits baked twice a day. Customised birthday and anniversary cakes.',
    inMarketSince: 2012,
    onlineDelivery: true,
    panIndia: true,
    products: [
      { name: 'Chocolate Cake', price: 550, discountedPrice: 499, description: 'Half kg eggless chocolate truffle cake with ganache.' },
      { name: 'Croissant', price: 90, discountedPrice: null, description: 'Butter croissant, baked fresh every morning.' },
      { name: 'Muffin (Box of 4)', price: 240, discountedPrice: 200, description: 'Assorted blueberry and choco chip muffins.' },
    ],
    promoDays: 60,
  },
  {
    shopName: 'Kumar Mobile Store',
    category: 'Mobile & Electronics',
    ownerName: 'Ajay Kumar',
    phone: '9765432109',
    address: 'Gandhi Road, Bhopal, MP',
    description: 'All brand smartphones, accessories, repairs and exchange offers. EMI available.',
    inMarketSince: 2016,
    onlineDelivery: true,
    panIndia: false,
    products: [
      { name: 'Screen Guard', price: 199, discountedPrice: 99, description: '9H tempered glass for all major smartphone models.' },
      { name: 'Phone Cover', price: 299, discountedPrice: 249, description: 'Shockproof silicone covers, 40+ designs in stock.' },
    ],
    promoDays: 0,
  },
];

async function run() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/call2now');

  const adminEmail = 'admin@call2now.in';
  if (!(await User.findOne({ email: adminEmail }))) {
    await User.create({
      name: 'Vaibhav (Admin)',
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'admin',
    });
    console.log('[seed] admin created → admin@call2now.in / Admin@123');
  }

  for (const s of SAMPLES) {
    const email = `${slugify(s.shopName).replace(/-/g, '')}@sample.in`;
    if (await User.findOne({ email })) continue;
    const user = await User.create({ name: s.ownerName, email, passwordHash: await bcrypt.hash('Sample@123', 10) });
    await BusinessProfile.create({
      user: user._id,
      category: s.category,
      shopName: s.shopName,
      ownerName: s.ownerName,
      phone: s.phone,
      whatsapp: s.phone,
      email,
      address: s.address,
      description: s.description,
      inMarketSince: s.inMarketSince,
      onlineDelivery: s.onlineDelivery,
      panIndia: s.panIndia,
      operationDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      operationOpen: '09:00',
      operationClose: '21:00',
      pageSlug: slugify(s.shopName),
      products: s.products,
      promo: { days: s.promoDays, startDate: s.promoDays ? new Date() : null },
      suggested: true,
    });
    console.log('[seed] profile created →', s.shopName);
  }

  if ((await PromoSlide.countDocuments()) === 0) {
    const veg = await BusinessProfile.findOne({ pageSlug: 'sharma-vegetables' });
    const bakery = await BusinessProfile.findOne({ pageSlug: 'royal-bakery' });
    await PromoSlide.create([
      { title: 'Sharma Vegetables: farm fresh daily', subtitle: '30 days promoted listing', profile: veg?._id },
      { title: 'Royal Bakery: custom cakes', subtitle: 'Order before 6 PM for same-day delivery', profile: bakery?._id },
    ]);
    console.log('[seed] promo slides created');
  }

  if ((await Ad.countDocuments()) === 0) {
    await Ad.create([
      { title: 'List your business free on Call2Now', subtitle: 'Get found by customers near you. Create your profile in 2 minutes.', ctaText: 'Get started', linkUrl: '/signup', placement: 'popup' },
      { title: 'Festive deals on Call2Now', subtitle: 'Up to 40% off at promoted stores this week.', ctaText: 'Browse deals', placement: 'popup' },
      { title: 'Advertise with us', subtitle: 'Reach thousands of local shoppers every day.', ctaText: 'Learn more', placement: 'left' },
      { title: 'Go premium', subtitle: 'Boost your listing to the top of search results.', ctaText: 'Upgrade', placement: 'right' },
    ]);
    console.log('[seed] sample ads created');
  }

  console.log('[seed] done');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('[seed] failed:', e.message);
      process.exit(1);
    });
}

module.exports = { run };
