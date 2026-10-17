const BusinessProfile = require('../models/BusinessProfile');
const PromoSlide = require('../models/PromoSlide');
const SiteSettings = require('../models/SiteSettings');
const Ad = require('../models/Ad');
const { storeFile } = require('../utils/files');

exports.listProfiles = async (req, res) => {
  const profiles = await BusinessProfile.find().sort({ createdAt: -1 }).populate('user', 'name email');
  res.json({ profiles: profiles.map((p) => ({ ...p.toObject(), email: p.user?.email || p.email })) });
};

exports.setTenure = async (req, res) => {
  const days = Number(req.body.days);
  if (![0, 30, 60, 365, 36500].includes(days))
    return res.status(400).json({ message: 'Tenure must be 0, 30, 60, 365 or 36500 days' });
  const profile = await BusinessProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  profile.promo = { days, startDate: days > 0 ? new Date() : null };
  await profile.save();
  res.json({ message: `Promotion set to ${days} days`, profile });
};

exports.setVerified = async (req, res) => {
  const verified = req.body.verified !== false && req.body.verified !== 'false';
  const profile = await BusinessProfile.findByIdAndUpdate(req.params.id, { $set: { verified } }, { new: true });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json({ message: verified ? 'Profile verified' : 'Verification removed', profile });
};

exports.setSuggested = async (req, res) => {
  const on = req.body.on !== false && req.body.on !== 'false';
  const profile = await BusinessProfile.findByIdAndUpdate(req.params.id, { $set: { suggested: on } }, { new: true });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json({ message: on ? 'Added to suggested profiles' : 'Removed from suggested profiles', profile });
};

exports.deleteProfile = async (req, res) => {
  const profile = await BusinessProfile.findByIdAndDelete(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json({ message: 'Profile deleted' });
};

exports.removeProduct = async (req, res) => {
  const profile = await BusinessProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  const before = profile.products.length;
  profile.products = profile.products.filter((p) => String(p._id) !== req.params.productId);
  if (profile.products.length === before) return res.status(404).json({ message: 'Product not found' });
  if (profile.products.length === 0) return res.status(400).json({ message: 'A profile must keep at least 1 product' });
  await profile.save();
  res.json({ message: 'Product removed', profile });
};

exports.listSlides = async (req, res) => {
  const slides = await PromoSlide.find().sort({ order: 1, createdAt: -1 }).populate('profile', 'shopName pageSlug');
  res.json({ slides });
};

exports.createSlide = async (req, res) => {
  const { title, subtitle, profileId, customUrl } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Slide title is required' });
  const image = await storeFile(req.file, 'slides');
  const slide = await PromoSlide.create({ title, subtitle: subtitle || '', image, profile: profileId || null, customUrl: customUrl || '' });
  res.status(201).json({ message: 'Slide created', slide });
};

exports.updateSlide = async (req, res) => {
  const slide = await PromoSlide.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!slide) return res.status(404).json({ message: 'Slide not found' });
  res.json({ message: 'Slide updated', slide });
};

exports.deleteSlide = async (req, res) => {
  const slide = await PromoSlide.findByIdAndDelete(req.params.id);
  if (!slide) return res.status(404).json({ message: 'Slide not found' });
  res.json({ message: 'Slide deleted' });
};

exports.getSettings = async (req, res) => {
  let s = await SiteSettings.findOne();
  if (!s) s = await SiteSettings.create({});
  res.json({ settings: { featuredLive: s.featuredLive } });
};

exports.setSettings = async (req, res) => {
  let s = await SiteSettings.findOne();
  if (!s) s = await SiteSettings.create({});
  if (typeof req.body.featuredLive === 'boolean') s.featuredLive = req.body.featuredLive;
  await s.save();
  res.json({ message: s.featuredLive ? 'Featured section is live' : 'Featured section is hidden', settings: { featuredLive: s.featuredLive } });
};

exports.listAds = async (req, res) => {
  const ads = await Ad.find().sort({ createdAt: -1 });
  res.json({ ads });
};

exports.createAd = async (req, res) => {
  const { title, subtitle, ctaText, linkUrl, placement } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Ad title is required' });
  if (!['popup', 'left', 'right'].includes(placement)) return res.status(400).json({ message: 'Placement must be popup, left or right' });
  const image = await storeFile(req.file, 'ads');
  const ad = await Ad.create({ title, subtitle: subtitle || '', ctaText: ctaText || '', linkUrl: linkUrl || '', image, placement });
  res.status(201).json({ message: 'Ad created', ad });
};

exports.toggleAd = async (req, res) => {
  const ad = await Ad.findByIdAndUpdate(req.params.id, { $set: { active: !!req.body.active } }, { new: true });
  if (!ad) return res.status(404).json({ message: 'Ad not found' });
  res.json({ message: ad.active ? 'Ad is live' : 'Ad hidden', ad });
};

exports.deleteAd = async (req, res) => {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (!ad) return res.status(404).json({ message: 'Ad not found' });
  res.json({ message: 'Ad deleted' });
};
