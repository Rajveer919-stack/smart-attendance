const express = require('express');
const {
  markAttendance,
  markByCode,
  getLiveClasses,
  getMyAttendance,
  getHistory,
} = require('../controllers/attendanceController');
const { getStudentCalendar } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');
const { markLimiter } = require('../middleware/security');
const { requireBio } = require('../middleware/bio');

const router = express.Router();

router.use(protect, authorize('student'));

router.post('/mark', markLimiter, requireBio, markAttendance);
router.post('/mark-code', markLimiter, requireBio, markByCode);
router.get('/live', getLiveClasses);
router.get('/me', getMyAttendance);
router.get('/history', getHistory);
router.get('/calendar/:subjectId', getStudentCalendar);

module.exports = router;