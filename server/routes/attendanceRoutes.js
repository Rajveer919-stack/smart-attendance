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

const router = express.Router();

router.use(protect, authorize('student'));

router.post('/mark', markLimiter, markAttendance);
router.post('/mark-code', markLimiter, markByCode);
router.get('/live', getLiveClasses);
router.get('/me', getMyAttendance);
router.get('/history', getHistory);
router.get('/calendar/:subjectId', getStudentCalendar);

module.exports = router;