const jwt = require('jsonwebtoken');
const Credential = require('../models/Credential');
const { getSettings } = require('../utils/settings');

// Attendance lagane se pehle: jis student ne fingerprint/face lock ON kiya hai (ya admin ne sabke liye
// zaroori kiya hai) uska taaza verify hona zaroori hai. Ye request ko kuch badalta nahi, sirf rokta hai.
exports.requireBio = async (req, res, next) => {
  try {
    const [settings, count] = await Promise.all([
      getSettings(),
      Credential.countDocuments({ user: req.user._id }),
    ]);

    if (count === 0) {
      if (settings.bioRequired) {
        return res.status(403).json({
          code: 'BIO_NOT_ENROLLED',
          message: 'Pehle apne dashboard me fingerprint/face lock ON karo, tabhi attendance lagegi',
        });
      }
      return next();
    }

    try {
      const p = jwt.verify(String((req.body && req.body.bioProof) || ''), process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
      if (p.purpose === 'bio' && p.sub === String(req.user._id)) return next();
    } catch {
      // neeche wala jawab jayega
    }
    return res.status(403).json({ code: 'BIO_REQUIRED', message: 'Pehle fingerprint/face se verify karo' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};