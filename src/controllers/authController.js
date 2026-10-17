const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const BusinessProfile = require('../models/BusinessProfile');
const Otp = require('../models/Otp');
const { signToken } = require('../middleware/auth');
const { generateCode, hashCode, sendOtpEmail, isProduction } = require('../utils/otp');

const OTP_TTL_MIN = 10;

const userJson = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role });

async function withProfile(user) {
  const profile = await BusinessProfile.findOne({ user: user._id }).select('pageSlug');
  return { user: userJson(user), hasProfile: Boolean(profile), profileSlug: profile?.pageSlug || null };
}

async function issueOtp(email, purpose, payload) {
  await Otp.deleteMany({ email, purpose });
  const code = generateCode();
  const otp = await Otp.create({
    email,
    purpose,
    codeHash: hashCode(code),
    payload,
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
  });
  let sent = false;
  try {
    sent = await sendOtpEmail(email, code);
  } catch (e) {
    console.error('[otp] send failed', e.code || e.message);
  }
  if (!sent && process.env.SMTP_HOST) {
    await Otp.deleteOne({ _id: otp._id });
    throw new Error('Could not send the verification email right now. Please try again in a minute.');
  }
  return { otp, code };
}

const devCode = (code) => (isProduction() ? undefined : code);

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ message: 'Name and valid email are required' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const { code } = await issueOtp(email.toLowerCase(), 'signup', { name: name.trim(), passwordHash });
    res.json({ message: 'OTP sent to your email', devCode: devCode(code) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const existing = await Otp.findOne({ email: email?.toLowerCase(), purpose });
    if (!existing) return res.status(404).json({ message: 'No pending verification for this email' });
    const code = generateCode();
    let sent = false;
    try {
      sent = await sendOtpEmail(existing.email, code);
    } catch (e) {
      console.error('[otp] resend failed', e.code || e.message);
    }
    if (!sent && process.env.SMTP_HOST)
      return res.status(500).json({ message: 'Could not send the verification email right now. Please try again in a minute.' });
    existing.codeHash = hashCode(code);
    existing.expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    await existing.save();
    res.json({ message: 'New OTP sent', devCode: devCode(code) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.verifySignup = async (req, res) => {
  try {
    const { email, code } = req.body;
    const otp = await Otp.findOne({ email: email?.toLowerCase(), purpose: 'signup' });
    if (!otp || otp.codeHash !== hashCode(code || '') || otp.expiresAt < new Date())
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    const user = await User.create({ name: otp.payload.name, email: otp.email, passwordHash: otp.payload.passwordHash });
    await Otp.deleteOne({ _id: otp._id });
    const token = signToken(user);
    res.json({ token, ...(await withProfile(user)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

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
    let { email, name, credential } = req.body;
    if (process.env.GOOGLE_CLIENT_ID && credential) {
      // Verify the Google ID token against Google's public keys.
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      const p = ticket.getPayload();
      email = p.email;
      name = p.name || p.email;
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

exports.forgotRequest = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    const { code } = await issueOtp(email, 'forgot', null);
    res.json({ message: 'OTP sent to your email', devCode: devCode(code) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.forgotVerify = async (req, res) => {
  try {
    const { email, code } = req.body;
    const otp = await Otp.findOne({ email: (email || '').toLowerCase(), purpose: 'forgot' });
    if (!otp || otp.codeHash !== hashCode(code || '') || otp.expiresAt < new Date())
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    const resetToken = crypto.randomBytes(32).toString('hex');
    otp.resetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    await otp.save();
    res.json({ message: 'OTP verified', resetToken });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.forgotReset = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const otp = await Otp.findOne({
      purpose: 'forgot',
      resetToken: crypto.createHash('sha256').update(resetToken || '').digest('hex'),
    });
    if (!otp || otp.expiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired reset link' });
    const user = await User.findOne({ email: otp.email });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Otp.deleteOne({ _id: otp._id });
    res.json({ message: 'Password updated successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
