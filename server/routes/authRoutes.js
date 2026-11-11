const express = require('express');
const {
  getClasses,
  registerRequest,
  registerVerify,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  createUser,
  updateAccount,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { rateLimit } = require('../utils/limiter');
const { cookieOnToken, fromCookie, clearLoginCookie, backupCookie } = require('../utils/loginCookie');

const router = express.Router();

const fifteenMin = 15 * 60 * 1000;
const otpSendLimit = rateLimit({ windowMs: fifteenMin, max: 5 });
const otpCheckLimit = rateLimit({ windowMs: fifteenMin, max: 15 });
const loginLimit = rateLimit({ windowMs: fifteenMin, max: 20 });
const restoreLimit = rateLimit({ windowMs: fifteenMin, max: 60 });

router.get('/classes', getClasses);
router.post('/register/request', otpSendLimit, registerRequest);
router.post('/register/verify', otpCheckLimit, cookieOnToken, registerVerify);
router.post('/login', loginLimit, cookieOnToken, login);
router.post('/forgot', otpSendLimit, forgotPassword);
router.post('/reset', otpCheckLimit, resetPassword);

router.get('/me', protect, backupCookie, getMe);

// App ka saved data mit gaya ho to cookie se login wapas (token + user)
router.post('/restore', restoreLimit, fromCookie, protect, (req, res) => {
  const orig = res.json.bind(res);
  res.json = (body) => orig({ ...body, token: req.restoredToken });
  return getMe(req, res);
});

// Logout: cookie bhi hata do, warna app khulte hi phir login ho jayega
router.post('/logout', (req, res) => {
  clearLoginCookie(req, res);
  res.json({ message: 'Logout ho gaya' });
});
router.put('/account', protect, updateAccount);
router.post('/create-user', protect, authorize('admin'), createUser);

module.exports = router;