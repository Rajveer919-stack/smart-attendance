const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login hona zaroori hai. Token header me "Bearer ..." ke roop me aata hai
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ message: 'Login karo pehle (token nahi mila)' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ message: 'Token invalid ya expire ho gaya' });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'User exist nahi karta' });
    }

    // Password badalne se pehle bana token ab kaam nahi karega
    if (user.passwordChangedAt && payload.iat && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      return res.status(401).json({ message: 'Token invalid ya expire ho gaya' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Sirf chune hue role wale hi aage ja sakte hai
exports.authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Tumhe is kaam ki permission nahi hai' });
    }
    next();
  };