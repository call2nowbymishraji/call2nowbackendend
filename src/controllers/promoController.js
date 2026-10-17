const PromoSlide = require('../models/PromoSlide');
const SiteSettings = require('../models/SiteSettings');
const Ad = require('../models/Ad');

exports.publicSlides = async (req, res) => {
  const slides = await PromoSlide.find({ active: true }).sort({ order: 1, createdAt: -1 }).populate('profile', 'shopName pageSlug');
  res.json({ slides });
};

exports.publicSettings = async (req, res) => {
  let s = await SiteSettings.findOne();
  if (!s) s = await SiteSettings.create({});
  res.json({ settings: { featuredLive: s.featuredLive } });
};

exports.publicAds = async (req, res) => {
  const { placement } = req.query;
  const filter = { active: true };
  if (placement) filter.placement = placement;
  const ads = await Ad.find(filter).sort({ createdAt: -1 });
  res.json({ ads });
};
