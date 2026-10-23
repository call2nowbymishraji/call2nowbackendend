const Category = require('../models/Category');
const BusinessProfile = require('../models/BusinessProfile');

const clean = (name) => (name || '').trim().replace(/\s+/g, ' ');
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (name) => new RegExp(`^${escapeRx(name)}$`, 'i');

exports.list = async (req, res) => {
  try {
    const cats = await Category.find().sort({ order: 1, name: 1 });
    res.json({ categories: cats.map((c) => c.name) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.adminList = async (req, res) => {
  try {
    const cats = await Category.find().sort({ order: 1, name: 1 });
    const counts = await BusinessProfile.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
    const byCat = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({ categories: cats.map((c) => ({ _id: c._id, name: c.name, profiles: byCat[c.name] || 0 })) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const name = clean(req.body.name);
    if (name.length < 2) return res.status(400).json({ message: 'Category name is too short' });
    if (await Category.findOne({ name: exact(name) })) return res.status(409).json({ message: 'That category already exists' });
    const top = await Category.findOne().sort({ order: -1 });
    const cat = await Category.create({ name, order: (top?.order || 0) + 1 });
    res.json({ category: { _id: cat._id, name: cat.name, profiles: 0 } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.rename = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const name = clean(req.body.name);
    if (name.length < 2) return res.status(400).json({ message: 'Category name is too short' });
    if (await Category.findOne({ _id: { $ne: cat._id }, name: exact(name) }))
      return res.status(409).json({ message: 'That category already exists' });
    const old = cat.name;
    cat.name = name;
    await cat.save();
    await BusinessProfile.updateMany({ category: old }, { category: name });
    res.json({ category: { _id: cat._id, name: cat.name } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
