const BusinessProfile = require('../models/BusinessProfile');
const { requestedCountry, countryQuery } = require('../utils/countryFilter');

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

// Searching these is how a visitor finds a shop when all they have is the number on a board
// or a visiting card. The digits are stored however the owner typed them, so the match has to
// ignore whatever sits between them.
const CONTACT_FIELDS = ['phone', 'whatsapp'];

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

// A phone number, in any of the ways one is typed: "9876543210", "+91 98765 43210",
// "098765-43210". Ten digits is the floor because that is a full mobile number here, and anything
// shorter is a pin code or an area code that the word search already handles. A country or trunk
// code is dropped so the last ten digits are what gets matched. Returns null when the text is not
// a number at all.
function coreDigits(text) {
  const value = String(text || '').trim();
  if (!value || /[^+\d\s().-]/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Owners store the number with whatever separators they typed, so the match ignores anything that
// sits between two digits.
const phonePattern = (digits) => new RegExp(digits.split('').join('\\D*'), 'i');

// One clause, not one per typed word: "98765 43210" is a single number, not two things that both
// have to appear somewhere on the profile.
function phoneClause(digits) {
  const rx = phonePattern(digits);
  return { $or: CONTACT_FIELDS.concat(SEARCH_FIELDS).map((f) => ({ [f]: rx })) };
}

exports.search = async (req, res) => {
  try {
    const { q, category, location, suggested } = req.query;
    const country = requestedCountry(req.query.country);
    const filter = { status: 'active' };
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    // "View all" on the homepage asks for this: the same list, ranking and filters, narrowed to
    // the profiles the admin marked as suggested.
    if (suggested === '1' || suggested === 'true') filter.suggested = true;
    const and = [];
    const cf = countryQuery(country);
    if (cf) and.push(cf);
    // Location words are place names, so they are kept as typed and each one must land on a
    // geo field. That makes "Jaipur Rajasthan" narrow the result instead of widening it.
    for (const t of splitWords(location)) {
      const rx = new RegExp(escapeRegex(t), 'i');
      and.push({ $or: GEO_FIELDS.map((f) => ({ [f]: rx })) });
    }
    const whole = coreDigits(q);
    if (whole) {
      and.push(phoneClause(whole));
    } else {
      // A number typed next to words ("sharma 9876543210") still has to be found by its digits,
      // so each token is checked for one instead of being searched as a word everywhere.
      for (const t of queryTokens(q)) {
        const digits = coreDigits(t);
        if (digits) {
          and.push(phoneClause(digits));
          continue;
        }
        const rx = new RegExp(variants(t).map(escapeRegex).join('|'), 'i');
        and.push({ $or: SEARCH_FIELDS.map((f) => ({ [f]: rx })) });
      }
    }
    if (and.length) filter.$and = and;
    // Most liked first: sorting in the query means the page limit keeps the popular shops rather
    // than the newest ones when a search matches more profiles than it can show.
    const profiles = await BusinessProfile.find(filter).sort({ likes: -1, createdAt: -1 }).limit(100);
    // A paid promotion still buys the front of the list, so it outranks likes. Behind it, likes
    // decide the order and a like tie falls back to the newer profile.
    profiles.sort(
      (a, b) =>
        promoScore(b) - promoScore(a) ||
        (b.likes || 0) - (a.likes || 0) ||
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ profiles });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.suggested = async (req, res) => {
  try {
    const cf = countryQuery(requestedCountry(req.query.country));
    const filter = { status: 'active', suggested: true };
    if (cf) Object.assign(filter, cf);
    const profiles = await BusinessProfile.find(filter)
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
