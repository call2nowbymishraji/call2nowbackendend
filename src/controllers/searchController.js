const BusinessProfile = require('../models/BusinessProfile');

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SEARCH_FIELDS = [
  'shopName',
  'ownerName',
  'description',
  'category',
  'customCategory',
  'products.name',
  'products.description',
  'address',
  'city',
  'state',
  'pincode',
];

const GEO_FIELDS = ['city', 'state', 'pincode', 'address', 'country'];

// Filler words people type around the real keywords. Every remaining word has to match,
// so leaving these in would drop correct results for "best dosa in jaipur".
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'is', 'are', 'was', 'be',
  'with', 'from', 'near', 'nearby', 'around', 'within', 'into', 'this', 'that', 'these', 'those',
  'there', 'here', 'where', 'which', 'who', 'my', 'me', 'we', 'you', 'your', 'our', 'their', 'it',
  'all', 'any', 'some', 'one', 'please', 'kindly', 'want', 'need', 'require', 'required', 'looking',
  'search', 'searching', 'find', 'get', 'give', 'show', 'have', 'has', 'had', 'do', 'does', 'did',
  'best', 'top', 'good', 'cheap', 'lowest', 'new', 'buy', 'buying', 'sell', 'selling', 'sale',
  'available', 'availability', 'price', 'prices', 'pricing', 'rate', 'rates', 'cost',
  'shop', 'shops', 'store', 'stores', 'item', 'items', 'product', 'products', 'thing', 'things',
  'dealer', 'dealers', 'business', 'businesses', 'service', 'services', 'shoppe', 'dukaan',
]);

// A plural query should still find the singular word in the data, e.g. "bottles" -> "Steel Water Bottle".
function variants(token) {
  const out = [token];
  if (token.length >= 5 && token.endsWith('s') && !/(ss|us|is)$/.test(token)) {
    for (const stem of [token.slice(0, -1), token.replace(/ies$/, 'y'), token.replace(/es$/, '')]) {
      if (stem.length >= 4 && stem !== token && !out.includes(stem)) out.push(stem);
    }
  }
  return out;
}

const splitWords = (s) =>
  String(s || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.replace(/[^a-z0-9&]/g, '').length > 1)
    .slice(0, 8);

function queryTokens(q) {
  const raw = splitWords(q);
  const kept = raw.filter((w) => !STOPWORDS.has(w));
  return kept.length ? kept : raw;
}

exports.search = async (req, res) => {
  try {
    const { q, category, location } = req.query;
    const filter = { status: 'active' };
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    const and = [];
    // Location words are place names, so they are kept as typed and each one must land on a
    // geo field. That makes "Jaipur Rajasthan" narrow the result instead of widening it.
    for (const t of splitWords(location)) {
      const rx = new RegExp(escapeRegex(t), 'i');
      and.push({ $or: GEO_FIELDS.map((f) => ({ [f]: rx })) });
    }
    for (const t of queryTokens(q)) {
      const rx = new RegExp(variants(t).map(escapeRegex).join('|'), 'i');
      and.push({ $or: SEARCH_FIELDS.map((f) => ({ [f]: rx })) });
    }
    if (and.length) filter.$and = and;
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
