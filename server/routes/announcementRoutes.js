const express = require('express');
const {
  createAnnouncement,
  getMine,
  deleteAnnouncement,
  getForStudent,
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');
const { limiter } = require('../middleware/security');

const router = express.Router();

router.use(protect);

// Teacher ek ghante me 20 se zyada announcement nahi bhej sakta (spam se bachav)
const postLimit = limiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Bahut zyada announcement. Thodi der baad bhejo',
  keyFn: (req) => 'ann:' + req.user._id,
});

router.get('/', authorize('student'), getForStudent);
router.get('/mine', authorize('teacher'), getMine);
router.post('/', authorize('teacher'), postLimit, createAnnouncement);
router.delete('/:id', authorize('teacher'), deleteAnnouncement);

module.exports = router;