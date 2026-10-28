const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const BusinessProfile = require('../models/BusinessProfile');
const Otp = require('../models/Otp');
const { signToken } = require('../middleware/auth');
const { generateCode, hashCode, sendOtpEmail, isProduction, mailConfigured } = require('../utils/otp');
const { normalizePhone, dobKey } = require('../utils/phoneDob');

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
  if (!sent && mailConfigured()) {
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
    if (!sent && mailConfigured())
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

// A date of birth is a low entropy secret, so guesses at it are capped per number.
// Password attempts are not counted: they are already bcrypt rate limited by the hash cost.
const DOB_MAX_ATTEMPTS = 8;
const DOB_WINDOW_MS = 15 * 60 * 1000;
const dobAttempts = new Map(); // phone -> { count, until }

function dobBlocked(phone) {
  const rec = dobAttempts.get(phone);
  if (rec && rec.until <= Date.now()) {
    dobAttempts.delete(phone);
    return false;
  }
  return Boolean(rec && rec.count >= DOB_MAX_ATTEMPTS);
}

function dobFailed(phone) {
  const rec = dobAttempts.get(phone);
  if (!rec || rec.until <= Date.now()) dobAttempts.set(phone, { count: 1, until: Date.now() + DOB_WINDOW_MS });
  else rec.count += 1;
}

const TOO_MANY = 'Too many attempts for this number. Please try again after some time.';

exports.signupPhone = async (req, res) => {
  try {
    const { name, password } = req.body;
    const phone = normalizePhone(req.body.phone);
    const dob = dobKey(req.body.dob);
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!phone) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number' });
    if (!dob) return res.status(400).json({ message: 'Select a valid date of birth' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ phone }))
      return res.status(409).json({ message: 'An account with this mobile number already exists' });
    const user = await User.create({
      name: name.trim(),
      phone,
      dob,
      passwordHash: await bcrypt.hash(password, 10),
    });
    res.json({ message: 'Account created', token: signToken(user), ...(await withProfile(user)) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'An account with this mobile number already exists' });
    res.status(500).json({ message: e.message });
  }
};

exports.loginPhone = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number' });
    const dob = req.body.dob ? dobKey(req.body.dob) : null;
    if (req.body.dob && !dob) return res.status(400).json({ message: 'Select a valid date of birth' });
    const password = req.body.password || '';
    if (!dob && !password) return res.status(400).json({ message: 'Enter your password or your date of birth' });
    // Locking the number out here would also lock out its owner, so only dob guesses are capped.
    if (dob && dobBlocked(phone)) return res.status(429).json({ message: TOO_MANY });
    const user = await User.findOne({ phone });
    let ok = false;
    if (dob) ok = Boolean(user?.dob && user.dob === dob);
    else ok = Boolean(user?.passwordHash && (await bcrypt.compare(password, user.passwordHash)));
    if (!ok) {
      if (dob) dobFailed(phone);
      return res
        .status(401)
        .json({ message: dob ? 'Mobile number and date of birth do not match' : 'Invalid mobile number or password' });
    }
    dobAttempts.delete(phone);
    res.json({ token: signToken(user), ...(await withProfile(user)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Phone plus the registered date of birth is the proof, so the new password is set in
// the same call and the caller is signed straight in.
exports.forgotPhoneReset = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const dob = dobKey(req.body.dob);
    const { newPassword } = req.body;
    if (!phone) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number' });
    if (!dob) return res.status(400).json({ message: 'Select a valid date of birth' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (dobBlocked(phone)) return res.status(429).json({ message: TOO_MANY });
    const user = await User.findOne({ phone });
    if (!user?.dob || user.dob !== dob) {
      dobFailed(phone);
      return res.status(401).json({ message: 'Mobile number and date of birth do not match our records' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    dobAttempts.delete(phone);
    res.json({ message: 'Password updated', token: signToken(user), ...(await withProfile(user)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
