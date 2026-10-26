const SiteSettings = require('../models/SiteSettings');

// The settings document is a singleton. findOneAndUpdate with upsert avoids the
// "two first requests both create it" duplicate-key race of findOne-then-create.
const settingsDoc = () => SiteSettings.findOneAndUpdate({}, {}, { new: true, upsert: true, setDefaultsOnInsert: true });

module.exports = { settingsDoc };
