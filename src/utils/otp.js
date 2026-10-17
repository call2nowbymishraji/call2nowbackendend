const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

async function sendOtpEmail(email, code) {
  const t = getTransporter();
  if (!t) {
    console.log(`[otp] dev mode — code for ${email}: ${code}`);
    return false;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@call2now.in',
    to: email,
    subject: 'Your Call2Now verification code',
    text: `Your Call2Now OTP is ${code}. It expires in 10 minutes.`,
  });
  return true;
}

const isProduction = () => process.env.NODE_ENV === 'production';

module.exports = { generateCode, hashCode, sendOtpEmail, isProduction };
