const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

let transporter = null;
const SMTP_TIMEOUTS = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 };

const makeTransport = (port) =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    ...SMTP_TIMEOUTS,
  });

const portOrder = () => {
  const configured = Number(process.env.SMTP_PORT || 587);
  return [configured, configured === 465 ? 587 : 465];
};

async function sendViaGas(mail) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(process.env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: process.env.GAS_SECRET, to: mail.to, subject: mail.subject, text: mail.text }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok !== true) throw new Error(data.error || `relay HTTP ${res.status}`);
    return true;
  } finally {
    clearTimeout(timer);
  }
}

async function sendOtpEmail(email, code) {
  if (!process.env.SMTP_HOST && !process.env.GAS_URL) {
    console.log(`[otp] dev mode — code for ${email}: ${code}`);
    return false;
  }
  const mail = {
    from: process.env.MAIL_FROM || 'no-reply@call2now.in',
    to: email,
    subject: 'Your Call2Now verification code',
    text: `Your Call2Now OTP is ${code}. It expires in 10 minutes.`,
  };
  let lastErr = null;
  if (process.env.GAS_URL) {
    try {
      await sendViaGas(mail);
      return true;
    } catch (e) {
      lastErr = e;
      console.error('[otp] relay send failed:', e.message);
    }
  }
  if (process.env.SMTP_HOST) {
    for (const port of portOrder()) {
      const t = makeTransport(port);
      try {
        await t.sendMail(mail);
        t.close();
        return true;
      } catch (e) {
        lastErr = e;
        console.error(`[otp] send failed on port ${port}:`, e.code || e.message);
        t.close();
      }
    }
  }
  throw lastErr || new Error('SMTP send failed');
}

const isProduction = () => process.env.NODE_ENV === 'production';
const mailConfigured = () => Boolean(process.env.SMTP_HOST || process.env.GAS_URL);

module.exports = { generateCode, hashCode, sendOtpEmail, isProduction, mailConfigured };
