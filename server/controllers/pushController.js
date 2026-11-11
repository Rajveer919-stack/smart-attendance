const PushSub = require('../models/PushSub');
const { init, validEndpoint, notifyUsers, pushAvailable } = require('../utils/push');

const MAX_DEVICES = 5;

// GET /api/push/key
exports.getKey = async (req, res) => {
  try {
    if (!pushAvailable()) return res.json({ enabled: false });
    const cfg = await init();
    if (!cfg) return res.json({ enabled: false });
    res.json({ enabled: true, publicKey: cfg.publicKey });
  } catch (err) {
    res.json({ enabled: false });
  }
};

// POST /api/push/subscribe   body: { subscription }
exports.subscribe = async (req, res) => {
  try {
    const s = req.body && req.body.subscription;
    const endpoint = s && s.endpoint;
    const p256dh = s && s.keys && s.keys.p256dh;
    const auth = s && s.keys && s.keys.auth;
    if (
      typeof endpoint !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string' ||
      p256dh.length > 200 ||
      auth.length > 100 ||
      !validEndpoint(endpoint)
    ) {
      return res.status(400).json({ message: 'Notification ka address sahi nahi hai' });
    }

    await PushSub.findOneAndUpdate(
      { endpoint },
      { $set: { user: req.user._id, keys: { p256dh, auth } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Ek user ke 5 se zyada device nahi, purane hata do
    const all = await PushSub.find({ user: req.user._id }).sort({ updatedAt: -1 }).select('_id').lean();
    if (all.length > MAX_DEVICES) {
      await PushSub.deleteMany({ _id: { $in: all.slice(MAX_DEVICES).map((x) => x._id) } });
    }
    res.status(201).json({ message: 'Notification ON ho gayi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/push/unsubscribe   body: { endpoint }
exports.unsubscribe = async (req, res) => {
  try {
    const endpoint = req.body && req.body.endpoint;
    if (typeof endpoint === 'string') {
      await PushSub.deleteOne({ endpoint, user: req.user._id });
    }
    res.json({ message: 'Notification band ho gayi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/push/test   (apne aap ko ek test notification)
exports.sendTest = async (req, res) => {
  try {
    const r = await notifyUsers([req.user._id], {
      title: 'Smart Attendance',
      body: 'Notification sahi chal rahi hai.',
      url: '/',
      tag: 'test',
      ttl: 60,
    });
    if (r.sent === 0) {
      return res.status(400).json({ message: 'Notification nahi ja payi. Pehle ON karo ya thodi der baad try karo' });
    }
    res.json({ message: 'Test notification bhej di' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};