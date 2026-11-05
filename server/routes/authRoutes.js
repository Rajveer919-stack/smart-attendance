const express = require('express');
const { register, login, getMe, createUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/create-user', protect, authorize('admin'), createUser);

module.exports = router;