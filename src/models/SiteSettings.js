const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    featuredLive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', settingsSchema);
