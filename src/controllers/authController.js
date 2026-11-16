const bcrypt = require('bcryptjs');
const User = require('../models/User');
const BusinessProfile = require('../models/BusinessProfile');
const { signToken } = require('../middleware/auth');
const { normalizePhone } = require('../utils/phone');

const userJson = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role });

async function withProfile(user) {
  const profile = await BusinessProfile.findOne({ user: user._id }).select('pageSlug');
  return { user: userJson(user), hasProfile: Boolean(profile), profileSlug: profile?.pageSlug || null };
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash)))
      return res.status(401).json({ message: 'Invalid email or password' });
    const token = signToken(user);
    res.json({ token, ...(await withProfile(user)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.google = async (req, res) => {
  try {
    const { credential } = req.body;
    let email;
    let name;
    if (credential) {
      // Verify the Google ID token against Google's public keys.
      if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ message: 'Google login is not configured on the server' });
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      const p = ticket.getPayload();
      if (!p?.email || p.email_verified === false) return res.status(401).json({ message: 'Google did not return a verified email' });
      email = p.email;
      name = p.name || p.email;
    } else if (process.env.GOOGLE_DEV_LOGIN === 'true') {
      // Demo shortcut for local runs only. GOOGLE_DEV_LOGIN must never be set in a
      // deployed environment, because this branch trusts whatever email is posted.
      ({ email, name } = req.body);
    } else {
      return res.status(401).json({ message: 'Google login requires a credential' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ message: 'Google login failed: no email provided' });
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) user = await User.create({ name: name || email.split('@')[0], email: email.toLowerCase() });
    const token = signToken(user);
    res.json({ token, ...(await withProfile(user)) });
  } catch (e) {
    res.status(401).json({ message: 'Google verification failed' });
  }
};

exports.me = async (req, res) => {
  try {
    res.json(await withProfile(req.user));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// The mobile number is the account. An email can be attached, which only ever buys the
// holder one extra way of typing their way in: nothing is verified and nothing is mailed,
// because a forgotten password is reset by the admin on the Accounts tab.
exports.signupPhone = async (req, res) => {
  try {
    const { name, password } = req.body;
    const phone = normalizePhone(req.body.phone);
    const email = (req.body.email || '').trim().toLowerCase();
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!phone) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number' });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email or leave it blank' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ phone }))
      return res.status(409).json({ message: 'An account with this mobile number already exists' });
    if (email && (await User.findOne({ email })))
      return res.status(409).json({ message: 'An account with this email already exists' });
    const user = await User.create({
      name: name.trim(),
      phone,
      // Left out entirely rather than set to an empty string: the sparse unique index only
      // skips absent paths, so one stored "" would block the next account that skips email.
      ...(email ? { email } : {}),
      passwordHash: await bcrypt.hash(password, 10),
    });
    res.json({ message: 'Account created', token: signToken(user), ...(await withProfile(user)) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'That mobile number or email is already registered' });
    res.status(500).json({ message: e.message });
  }
};

exports.loginPhone = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number' });
    const password = req.body.password || '';
    if (!password) return res.status(400).json({ message: 'Password is required' });
    const user = await User.findOne({ phone });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: 'Invalid mobile number or password' });
    res.json({ token: signToken(user), ...(await withProfile(user)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
