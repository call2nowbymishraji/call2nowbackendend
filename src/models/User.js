const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Mobile accounts carry no email, so these indexes have to stay sparse: a plain unique
    // index treats every missing value as null and only the first such account would save.
    // The fields must also stay unset rather than defaulted to null, because sparse skips
    // absent paths only.
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    dob: { type: String, default: null },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
