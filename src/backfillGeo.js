// One-off: guesses city, state and pin code for profiles created before the
// structured address fields existed. Dry run by default; pass --apply to write.
require('dotenv').config();
const mongoose = require('mongoose');
const BusinessProfile = require('./models/BusinessProfile');
const { INDIA_STATES, allIndiaCities } = require('./utils/geoData');

const STATE_ABBR = {
  MP: 'Madhya Pradesh',
  UP: 'Uttar Pradesh',
  RJ: 'Rajasthan',
  MH: 'Maharashtra',
  GJ: 'Gujarat',
  KA: 'Karnataka',
  TN: 'Tamil Nadu',
  WB: 'West Bengal',
  BR: 'Bihar',
  OD: 'Odisha',
  OR: 'Odisha',
  PB: 'Punjab',
  HR: 'Haryana',
  UK: 'Uttarakhand',
  KL: 'Kerala',
  TG: 'Telangana',
  AP: 'Andhra Pradesh',
  JH: 'Jharkhand',
  CG: 'Chhattisgarh',
  AS: 'Assam',
  DL: 'Delhi',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  LA: 'Ladakh',
  SK: 'Sikkim',
  TR: 'Tripura',
  NL: 'Nagaland',
  MN: 'Manipur',
  ML: 'Meghalaya',
  AR: 'Arunachal Pradesh',
  MZ: 'Mizoram',
  GA: 'Goa',
  PY: 'Puducherry',
  CH: 'Chandigarh',
  LD: 'Lakshadweep',
  DN: 'Dadra and Nagar Haveli and Daman and Diu',
};

const STATE_TO_ABBR = Object.fromEntries(Object.entries(STATE_ABBR).map(([abbr, state]) => [state, abbr]));

const CITY_BY_LOWER = new Map(allIndiaCities.map((c) => [c.city.toLowerCase(), c]));
const STATE_BY_LOWER = new Map(INDIA_STATES.map((s) => [s.toLowerCase(), s]));

// Keeps only letters so "West Bengal 700001" and "Indore." still compare equal.
const normalize = (s) =>
  s
    .replace(/\b\d{6}\b/g, ' ')
    .replace(/[^A-Za-z&\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Drops trailing ", Indore, MP" style segments once they live in their own fields,
// so the public page does not print the city twice. Never touches a single segment address.
function cleanAddress(address, g) {
  if (!address || (!g.city && !g.state && !g.pincode)) return address;
  const segs = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (segs.length < 2) return address;
  const geoTokens = new Set();
  const addTokens = (s) =>
    String(s || '')
      .toLowerCase()
      .split(/[^a-z0-9&]+/)
      .filter(Boolean)
      .forEach((t) => geoTokens.add(t));
  addTokens(g.city);
  addTokens(g.state);
  addTokens(STATE_TO_ABBR[g.state]);
  addTokens(g.pincode);
  const isGeo = (seg) => {
    const toks = seg.toLowerCase().split(/[^a-z0-9&]+/).filter(Boolean);
    return toks.length > 0 && toks.every((t) => geoTokens.has(t));
  };
  while (segs.length > 1 && isGeo(segs[segs.length - 1])) segs.pop();
  return segs.join(', ');
}

// Reads comma segments from the end and only accepts an exact city or state name,
// so "Kochi Road" or "Jaipur Plaza" cannot invent a location.
function guess(address) {
  const text = address || '';
  const out = {};

  const pin = text.match(/\b(\d{6})\b/);
  if (pin) out.pincode = pin[1];

  const segs = text.split(',').map((s) => s.trim()).filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const hit = CITY_BY_LOWER.get(normalize(segs[i]));
    if (hit) {
      out.city = hit.city;
      out.state = hit.state;
      return out;
    }
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const key = normalize(segs[i]);
    const state = STATE_BY_LOWER.get(key) || STATE_ABBR[key.replace(/\s+/g, '').toUpperCase()];
    if (state) {
      out.state = state;
      return out;
    }
  }
  return out;
}

async function run() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGO_URI);
  const profiles = await BusinessProfile.find({ $or: [{ city: '' }, { city: null }, { city: { $exists: false } }] });
  console.log(`[backfillGeo] ${profiles.length} profile(s) without a city (mode: ${apply ? 'APPLY' : 'dry run'})`);

  let changed = 0;
  for (const p of profiles) {
    const g = guess(p.address);
    if (!g.city && !g.state && !g.pincode) {
      console.log(`  - ${p.shopName}: no match in "${p.address}"`);
      continue;
    }
    const newAddress = cleanAddress(p.address, g);
    console.log(
      `  - ${p.shopName}: "${p.address}" -> city=${g.city || '(none)'} state=${g.state || '(none)'} pincode=${g.pincode || '(none)'} address="${newAddress}"`
    );
    changed += 1;
    if (apply) {
      await BusinessProfile.updateOne(
        { _id: p._id },
        {
          $set: {
            country: 'India',
            ...(g.city ? { city: g.city } : {}),
            ...(g.state ? { state: g.state } : {}),
            ...(g.pincode ? { pincode: g.pincode } : {}),
            ...(newAddress !== p.address ? { address: newAddress } : {}),
          },
        }
      );
    }
  }
  console.log(`[backfillGeo] ${changed} profile(s) ${apply ? 'updated' : 'would be updated'}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch((e) => {
    console.error('[backfillGeo] failed:', e.message);
    process.exit(1);
  });
}

module.exports = { run, guess, cleanAddress };
