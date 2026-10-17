const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['signup', 'forgot'], required: true },
  codeHash: { type: String, required: true },
  payload: { type: Object, default: null }, // signup: { name, passwordHash }
  resetToken: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('Otp', otpSchema);
