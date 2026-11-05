const express = require('express');
const {
  startSession,
  getQr,
  endSession,
  getMySessions,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('teacher'));

router.get('/', getMySessions);
router.post('/start', startSession);
router.get('/:id/qr', getQr);
router.post('/:id/end', endSession);

module.exports = router;