const PromoSlide = require('../models/PromoSlide');
const Ad = require('../models/Ad');
const { settingsDoc } = require('../utils/settings');
const { requestedCountry, matchesCountry } = require('../utils/countryFilter');

exports.publicSlides = async (req, res) => {
  const country = requestedCountry(req.query.country);
  const slides = await PromoSlide.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .populate('profile', 'shopName pageSlug country');
  // A slide points at a profile instead of storing a country, so the picker narrows the
  // populated rows. Banner slides with no business behind them are not country specific and
  // stay in every view.
  res.json({ slides: country ? slides.filter((s) => !s.profile || matchesCountry(s.profile.country, country)) : slides });
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
