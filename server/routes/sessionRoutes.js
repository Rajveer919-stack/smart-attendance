const express = require('express');
const {
  startSession,
  getQr,
  getCode,
  endSession,
  getMySessions,
  getSessionAttendance,
  setManualAttendance,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('teacher'));

router.get('/', getMySessions);
router.post('/start', startSession);
router.get('/:id/qr', getQr);
router.get('/:id/code', getCode);
router.get('/:id/attendance', getSessionAttendance);
router.put('/:id/attendance/:studentId', setManualAttendance);
router.post('/:id/end', endSession);

module.exports = router;