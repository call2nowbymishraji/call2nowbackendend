const BusinessProfile = require('../models/BusinessProfile');
const { uniqueSlug } = require('../utils/slug');
const { storeFile } = require('../utils/files');

const fileByField = (req, field) => req.files?.find((f) => f.fieldname === field);
const filesByField = (req, field) => req.files?.filter((f) => f.fieldname === field) || [];

function parseBody(req) {
  const b = req.body;
  const bool = (v) => v === true || v === 'true';
  let products = [];
  try {
    products = JSON.parse(b.products || '[]');
  } catch {
    products = [];
  }
  let operationDays = [];
  try {
    operationDays = JSON.parse(b.operationDays || '[]');
  } catch {
    operationDays = [];
  }
  let keepGallery = [];
  try {
    keepGallery = JSON.parse(b.keepGallery || '[]');
  } catch {
    keepGallery = [];
  }
  return {
    category: b.category,
    customCategory: b.customCategory || '',
    shopName: b.shopName,
    ownerName: b.ownerName,
    phone: b.phone,
    whatsapp: b.whatsapp || b.phone,
    email: b.email,
    address: b.address,
    inMarketSince: b.inMarketSince ? Number(b.inMarketSince) : null,
    description: b.description || '',
    gst: b.gst || '',
    mapUrl: b.mapUrl || '',
    instagram: b.instagram || '',
    facebook: b.facebook || '',
    telegram: b.telegram || '',
    whatsappUrl: b.whatsappUrl || '',
    website: b.website || '',
    x: b.x || '',
    linkedin: b.linkedin || '',
    onlineDelivery: bool(b.onlineDelivery),
    panIndia: bool(b.panIndia),
    operationDays,
    operationOpen: b.operationOpen || '09:00',
    operationClose: b.operationClose || '21:00',
    products,
    keepGallery,
  };
}

async function assemble(data, req) {
  const out = { ...data };
  delete out.products;
  delete out.keepGallery;

  const shopFile = fileByField(req, 'shopImage');
  out.shopImage = shopFile ? await storeFile(shopFile, 'shops') : req.body.keepShopImage || null;

  const coverFile = fileByField(req, 'coverImage');
  out.coverImage = coverFile ? await storeFile(coverFile, 'covers') : req.body.keepCoverImage || null;

  const newGallery = await Promise.all(filesByField(req, 'gallery').map((f) => storeFile(f, 'gallery')));
  out.gallery = [...data.keepGallery, ...newGallery].slice(0, 9);

  out.products = await Promise.all(
    data.products.map(async (p, i) => {
      const f = fileByField(req, p.imageField || `productImage_${i}`);
      return {
        name: p.name,
        price: p.price ?? null,
        discountedPrice: p.discountedPrice ?? null,
        description: p.description,
        image: f ? await storeFile(f, 'products') : p.image || null,
      };
    })
  );
  return out;
}

function validate(data, res) {
  if (!data.category?.trim()) return res.status(400).json({ message: 'Category is required' });
  if (!data.shopName?.trim()) return res.status(400).json({ message: 'Shop / business name is required' });
  if (!data.ownerName?.trim()) return res.status(400).json({ message: 'Owner name is required' });
  if (!/^\d{10}$/.test((data.phone || '').replace(/\D/g, ''))) return res.status(400).json({ message: 'A 10-digit phone number is required' });
  if (!/^\S+@\S+\.\S+$/.test(data.email || '')) return res.status(400).json({ message: 'Valid email is required' });
  if (!data.address?.trim()) return res.status(400).json({ message: 'Address is required' });
  if (!data.products.length) return res.status(400).json({ message: 'At least 1 product is compulsory' });
  if (data.products.length > 10) return res.status(400).json({ message: 'Maximum 10 products allowed' });
  for (const p of data.products) {
    if (!p.name?.trim()) return res.status(400).json({ message: 'Every product needs a name' });
    if (!p.description?.trim()) return res.status(400).json({ message: `Product "${p.name}" needs a description` });
    if (p.description.trim().split(/\s+/).filter(Boolean).length > 500)
      return res.status(400).json({ message: `Product "${p.name}" description exceeds 500 words` });
  }
  return null;
}

exports.create = async (req, res) => {
  try {
    const existing = await BusinessProfile.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ message: 'You already have a profile. Edit it instead.' });
    const data = parseBody(req);
    const err = validate(data, res);
    if (err) return;
    const body = await assemble(data, req);
    const profile = await BusinessProfile.create({
      ...body,
      user: req.user._id,
      pageSlug: await uniqueSlug(BusinessProfile, data.shopName),
    });
    res.status(201).json({ message: 'Profile created', profile });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ _id: req.params.id, user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const data = parseBody(req);
    const err = validate(data, res);
    if (err) return;
    const body = await assemble(data, req);
    Object.assign(profile, body);
    await profile.save();
    res.json({ message: 'Profile updated', profile });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.mine = async (req, res) => {
  const profile = await BusinessProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'You have not created a profile yet' });
  res.json({ profile });
};

exports.bySlug = async (req, res) => {
  const profile = await BusinessProfile.findOne({ pageSlug: req.params.slug, status: 'active' });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });
  res.json({ profile });
};
