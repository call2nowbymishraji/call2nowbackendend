const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The navbar location picker sends "all" when nothing is narrowed; anything else is a country name.
const requestedCountry = (value) =>
  typeof value === 'string' && value.trim() && !/^all$/i.test(value.trim()) ? value.trim() : '';

// Profiles saved before the country field existed store nothing, and Mongoose only fills the India
// default in memory, so an India filter has to treat a missing value as India too.
const countryQuery = (wanted) => {
  if (!wanted) return null;
  const exact = new RegExp(`^${escapeRegex(wanted)}$`, 'i');
  if (wanted.toLowerCase() === 'india') {
    return { $or: [{ country: exact }, { country: { $exists: false } }, { country: null }, { country: '' }] };
  }
  return { country: exact };
};

// Same rule for rows already loaded in memory, which is how the promo slider is filtered
// (its slides point at profiles rather than storing a country themselves).
const matchesCountry = (country, wanted) =>
  !wanted || String(country || 'India').toLowerCase() === wanted.toLowerCase();

module.exports = { requestedCountry, countryQuery, matchesCountry };
