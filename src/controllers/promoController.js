const PromoSlide = require('../models/PromoSlide');
const Ad = require('../models/Ad');
const { settingsDoc } = require('../utils/settings');

exports.publicSlides = async (req, res) => {
  const slides = await PromoSlide.find({ active: true }).sort({ order: 1, createdAt: -1 }).populate('profile', 'shopName pageSlug');
  res.json({ slides });
};

exports.publicSettings = async (req, res) => {
  const s = await settingsDoc();
  res.json({ settings: { featuredLive: s.featuredLive, homeFiltersLive: s.homeFiltersLive } });
};

exports.publicAds = async (req, res) => {
  const { placement } = req.query;
  const filter = { active: true };
  if (typeof placement === 'string' && placement) filter.placement = placement;
  const ads = await Ad.find(filter).sort({ createdAt: -1 });
  res.json({ ads });
};
