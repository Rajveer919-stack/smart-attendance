const express = require('express');
const { getSubjectReport } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('teacher', 'admin'));

router.get('/subject/:subjectId', getSubjectReport);

module.exports = router;