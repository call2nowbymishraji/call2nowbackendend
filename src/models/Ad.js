const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    image: { type: String, default: null },
    placement: { type: String, enum: ['popup', 'left', 'right'], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ad', adSchema);
