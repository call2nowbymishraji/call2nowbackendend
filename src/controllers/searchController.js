const BusinessProfile = require('../models/BusinessProfile');

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.search = async (req, res) => {
  try {
    const { q, category, location } = req.query;
    const filter = { status: 'active' };
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (location) filter.address = new RegExp(escapeRegex(location), 'i');
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { shopName: rx },
        { ownerName: rx },
        { description: rx },
        { category: rx },
        { customCategory: rx },
        { 'products.name': rx },
        { 'products.description': rx },
      ];
    }
    const profiles = await BusinessProfile.find(filter).sort({ createdAt: -1 }).limit(100);
    profiles.sort((a, b) => promoScore(b) - promoScore(a));
    res.json({ profiles });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.suggested = async (req, res) => {
  try {
    const profiles = await BusinessProfile.find({ status: 'active', suggested: true })
      .sort({ 'promo.days': -1, 'promo.startDate': -1, createdAt: -1 })
      .limit(24);
    res.json({ profiles });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

function promoScore(p) {
  const days = p.promo?.days || 0;
  if (!days || !p.promo?.startDate) return 0;
  const withinWindow = days >= 365 || new Date(p.promo.startDate) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  return withinWindow ? days : 0;
}
