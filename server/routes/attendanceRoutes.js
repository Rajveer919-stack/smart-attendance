const express = require('express');
const { markAttendance, getMyAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('student'));

router.post('/mark', markAttendance);
router.get('/me', getMyAttendance);

module.exports = router;