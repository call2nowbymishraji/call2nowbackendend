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
    country: { type: String, default: 'India', trim: true },
    state: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
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
    youtube: { type: String, default: '' },
    shopImage: { type: String, default: null },
    pageSlug: { type: String, required: true, unique: true },
    onlineDelivery: { type: Boolean, default: false },
    panIndia: { type: Boolean, default: false },
    operationDays: { type: [String], default: [] },
    operationOpen: { type: String, default: '09:00' },
    operationClose: { type: String, default: '21:00' },
    // No length validators here on purpose. Profiles saved under the older 9 photo and 10 product
    // limits stay savable (the admin promo and product screens call save()), so the 5/5 ceiling
    // lives in profileController where a new or edited listing is checked.
    gallery: { type: [String], default: [] },
    products: { type: [productSchema], default: [] },
    promo: {
      days: { type: Number, enum: [0, 30, 60, 365, 36500], default: 0 },
      startDate: { type: Date, default: null },
    },
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
    suggested: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    // Every like that passes the one-per-device check raises this by one, so search can order
    // by popularity without counting the Like collection for each result.
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

profileSchema.index({ shopName: 'text', ownerName: 'text', description: 'text', category: 'text' });
profileSchema.index({ city: 1, state: 1 });
profileSchema.index({ likes: -1, createdAt: -1 });

module.exports = mongoose.model('BusinessProfile', profileSchema);
