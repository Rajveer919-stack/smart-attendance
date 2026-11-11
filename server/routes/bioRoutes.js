const express = require('express');
const {
  getStatus,
  registerOptions,
  register,
  authOptions,
  verify,
  resetUser,
} = require('../controllers/bioController');
const { protect, authorize } = require('../middleware/auth');
const { limiter } = require('../middleware/security');

const router = express.Router();

router.use(protect);

const bioLimit = limiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: 'Bahut zyada koshish. Thodi der baad try karo',
  keyFn: (req) => 'bio:' + req.user._id,
});

router.get('/status', authorize('student'), getStatus);
router.post('/register-options', authorize('student'), bioLimit, registerOptions);
router.post('/register', authorize('student'), bioLimit, register);
router.post('/auth-options', authorize('student'), bioLimit, authOptions);
router.post('/verify', authorize('student'), bioLimit, verify);
router.post('/reset', authorize('admin'), resetUser);

module.exports = router;