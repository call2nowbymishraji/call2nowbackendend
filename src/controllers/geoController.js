const { COUNTRIES, INDIA_STATES, citiesFor, allIndiaCities } = require('../utils/geoData');

exports.countries = (req, res) => res.json({ countries: COUNTRIES });

exports.states = (req, res) => {
  const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';
  res.json({ states: country === 'India' ? INDIA_STATES : [] });
};

exports.cities = (req, res) => {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const country = str(req.query.country);
  const state = str(req.query.state);
  res.json({ cities: citiesFor(country, state) });
};

exports.allCities = (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ cities: allIndiaCities });
};
