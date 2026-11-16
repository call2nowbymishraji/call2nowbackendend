const crypto = require('crypto');

// The browser sends a random id it made for itself, never a cookie or a sign-in. Hashing it
// with the server secret means the stored rows cannot be matched back to a device, and a
// visitor who likes the same shop from a second device is still counted twice: the like is
// per device, not per person.
function hashDevice(deviceId, profileId) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'call2now-dev-secret-change-me').update(`${deviceId}|${profileId}`).digest('hex');
}

// Only ever used for the daily cap, so a hash is enough and no raw IP ends up in the database.
function hashIp(ip) {
  if (!ip) return '';
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'call2now-dev-secret-change-me').update(String(ip)).digest('hex');
}

const DEVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const PAGE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;

const validDeviceId = (v) => DEVICE_ID.test(String(v || ''));
const validSlug = (v) => PAGE_SLUG.test(String(v || ''));

module.exports = { hashDevice, hashIp, validDeviceId, validSlug };
