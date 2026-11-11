const express = require('express');
const { getKey, subscribe, unsubscribe, sendTest } = require('../controllers/pushController');
const { protect } = require('../middleware/auth');
const { limiter } = require('../middleware/security');

const router = express.Router();

router.use(protect);

const pushLimit = limiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyFn: (req) => 'push:' + req.user._id,
});

router.get('/key', getKey);
router.post('/subscribe', pushLimit, subscribe);
router.post('/unsubscribe', pushLimit, unsubscribe);
router.post('/test', limiter({ windowMs: 10 * 60 * 1000, max: 5, keyFn: (req) => 'pt:' + req.user._id }), sendTest);

module.exports = router;