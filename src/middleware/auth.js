const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    // A token minted before the password was last changed carries the old version, so it stops
    // working the moment the counter moves. Tokens from before this field existed read as 0,
    // which matches every account that has not had a reset.
    if ((decoded.pv || 0) !== (user.passwordVersion || 0))
      return res.status(401).json({ message: 'Session expired, please log in again' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, pv: user.passwordVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

module.exports = { protect, adminOnly, signToken };
