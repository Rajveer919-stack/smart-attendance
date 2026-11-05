const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token check: login hona zaroori hai
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ message: 'Login karo pehle (token nahi mila)' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User exist nahi karta' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid ya expire ho gaya' });
  }
};

// Role check: sirf allowed roles hi aage jaaye
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Tumhe is kaam ki permission nahi hai' });
  }
  next();
};

module.exports = { protect, authorize };