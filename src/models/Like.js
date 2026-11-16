const mongoose = require('mongoose');
const BusinessProfile = require('../models/BusinessProfile');
const { hash } = require('../utils/device');

// One document per (profile, device) pair. The unique index is what stops the same device
// liking a shop twice, so the counter on the profile is only raised when a row is really new.
const likeSchema = new mongoose.Schema(
  {
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true },
    deviceHash: { type: String, required: true },
    ipHash: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

likeSchema.index({ profile: 1, deviceHash: 1 }, { unique: true });
likeSchema.index({ ipHash: 1, createdAt: -1 });

module.exports = mongoose.model('Like', likeSchema);
