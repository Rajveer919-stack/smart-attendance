const express = require('express');
const { getMyGamify } = require('../controllers/gamifyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('student'));
router.get('/me', getMyGamify);

module.exports = router;