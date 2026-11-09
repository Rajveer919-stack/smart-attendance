const express = require('express');
const {
  getLogs,
  getLocked,
  unlockUser,
  getSettingsHandler,
  updateSettingsHandler,
} = require('../controllers/securityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/logs', getLogs);
router.get('/locked', getLocked);
router.post('/unlock/:id', unlockUser);
router.get('/settings', getSettingsHandler);
router.put('/settings', updateSettingsHandler);

module.exports = router;