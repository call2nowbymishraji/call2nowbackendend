const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: null },
    discountedPrice: { type: Number, default: null },
    description: { type: String, required: true, trim: true },
    image: { type: String, default: null },
  },
  { _id: true }
);

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    category: { type: String, required: true },
    customCategory: { type: String, default: '' },
    shopName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    whatsapp: { type: String, default: '' },
    email: { type: String, required: true },
    address: { type: String, required: true },
    inMarketSince: { type: Number, default: null },
    description: { type: String, default: '' },
    gst: { type: String, default: '' },
    mapUrl: { type: String, default: '' },
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    telegram: { type: String, default: '' },
    whatsappUrl: { type: String, default: '' },
    website: { type: String, default: '' },
    x: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    shopImage: { type: String, default: null },
    coverImage: { type: String, default: null },
    pageSlug: { type: String, required: true, unique: true },
    onlineDelivery: { type: Boolean, default: false },
    panIndia: { type: Boolean, default: false },
    operationDays: { type: [String], default: [] },
    operationOpen: { type: String, default: '09:00' },
    operationClose: { type: String, default: '21:00' },
    gallery: { type: [String], default: [], validate: (v) => v.length <= 9 },
    products: {
      type: [productSchema],
      validate: {
        validator: (v) => v.length >= 1 && v.length <= 10,
        message: 'A profile needs between 1 and 10 products',
      },
    },
    promo: {
      days: { type: Number, enum: [0, 30, 60, 365, 36500], default: 0 },
      startDate: { type: Date, default: null },
    },
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
    suggested: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

profileSchema.index({ shopName: 'text', ownerName: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('BusinessProfile', profileSchema);
