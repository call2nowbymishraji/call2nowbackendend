const BusinessProfile = require('../models/BusinessProfile');
const Like = require('../models/Like');
const { hashDevice, hashIp, validDeviceId, validSlug } = require('../utils/device');

const DAY_MS = 24 * 60 * 60 * 1000;
// A visitor who clears browser storage gets a fresh device id and can like again. This cap is
// the backstop that keeps that from turning into unlimited likes from one connection.
const MAX_LIKES_PER_IP_PER_DAY = 40;

exports.like = async (req, res) => {
  const { slug, deviceId } = req.body || {};
  if (!validSlug(slug)) return res.status(400).json({ message: 'Invalid business' });
  if (!validDeviceId(deviceId)) return res.status(400).json({ message: 'Invalid device' });

  const profile = await BusinessProfile.findOne({ pageSlug: slug, status: 'active' }).select('_id likes');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  const deviceHash = hashDevice(deviceId, profile._id);
  const ipHash = hashIp(req.ip);

  // Counting first and only then writing keeps the counter and the rows in step: a repeat visit
  // from the same device answers with the existing total instead of raising it again.
  if (await Like.exists({ profile: profile._id, deviceHash })) {
    return res.json({ likes: profile.likes || 0, liked: true, alreadyLiked: true });
  }

  if (ipHash) {
    const fromIp = await Like.countDocuments({ ipHash, createdAt: { $gt: new Date(Date.now() - DAY_MS) } });
    if (fromIp >= MAX_LIKES_PER_IP_PER_DAY) {
      return res.status(429).json({ message: 'Too many likes from this connection today. Try again tomorrow.' });
    }
  }

  try {
    await Like.create({ profile: profile._id, deviceHash, ipHash });
  } catch (e) {
    // Two tabs from one device can submit together. The unique index lets exactly one through,
    // and the loser reports the like as already given rather than failing.
    if (e.code === 11000) return res.json({ likes: profile.likes || 0, liked: true, alreadyLiked: true });
    throw e;
  }

  const withCount = await BusinessProfile.findByIdAndUpdate(profile._id, { $inc: { likes: 1 } }, { new: true }).select('likes');
  res.json({ likes: withCount ? withCount.likes : (profile.likes || 0) + 1, liked: true });
};
