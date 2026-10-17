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

async function sendOtpEmail(email, code) {
  if (!process.env.SMTP_HOST) {
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
  throw lastErr || new Error('SMTP send failed');
}

const isProduction = () => process.env.NODE_ENV === 'production';

module.exports = { generateCode, hashCode, sendOtpEmail, isProduction };
