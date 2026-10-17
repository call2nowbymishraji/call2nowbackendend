const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    image: { type: String, default: null },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', default: null },
    customUrl: { type: String, default: '' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromoSlide', slideSchema);
