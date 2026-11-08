const express = require('express');
const { markAttendance, getMyAttendance } = require('../controllers/attendanceController');
const { getStudentCalendar } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('student'));

router.post('/mark', markAttendance);
router.get('/me', getMyAttendance);
router.get('/calendar/:subjectId', getStudentCalendar);

module.exports = router;