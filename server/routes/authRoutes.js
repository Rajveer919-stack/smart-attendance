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

const router = express.Router();

const fifteenMin = 15 * 60 * 1000;
const otpSendLimit = rateLimit({ windowMs: fifteenMin, max: 5 });
const otpCheckLimit = rateLimit({ windowMs: fifteenMin, max: 15 });
const loginLimit = rateLimit({ windowMs: fifteenMin, max: 20 });

router.get('/classes', getClasses);
router.post('/register/request', otpSendLimit, registerRequest);
router.post('/register/verify', otpCheckLimit, registerVerify);
router.post('/login', loginLimit, login);
router.post('/forgot', otpSendLimit, forgotPassword);
router.post('/reset', otpCheckLimit, resetPassword);

router.get('/me', protect, getMe);
router.put('/account', protect, updateAccount);
router.post('/create-user', protect, authorize('admin'), createUser);

module.exports = router;