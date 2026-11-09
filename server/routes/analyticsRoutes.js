const express = require('express');
const {
  getSubjectReport,
  getSubjectDaily,
  exportSubjectExcel,
  getOverview,
} = require('../controllers/analyticsController');
const { alertLowAttendance } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Sirf admin: dashboard ke charts
router.get('/overview', authorize('admin'), getOverview);

// Teacher (apna subject) ya admin (sab)
router.get('/subject/:subjectId', authorize('teacher', 'admin'), getSubjectReport);
router.get('/subject/:subjectId/daily', authorize('teacher', 'admin'), getSubjectDaily);
router.get('/subject/:subjectId/export', authorize('teacher', 'admin'), exportSubjectExcel);
router.post('/subject/:subjectId/alert', authorize('teacher', 'admin'), alertLowAttendance);

module.exports = router;