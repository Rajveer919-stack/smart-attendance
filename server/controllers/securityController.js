const SecurityLog = require('../models/SecurityLog');
const User = require('../models/User');
const { getSettings, saveSettings } = require('../utils/settings');
const { logEvent } = require('../utils/audit');

// Suspicious activity wale types. Baaki sab audit (kisne kya badla) me aate hai
const SECURITY_TYPES = ['device_reuse', 'shared_device', 'out_of_range', 'no_location', 'login_locked', 'code_wrong', 'code_locked', 'bio_failed'];

// GET /api/security/logs?group=security|audit|all&limit=100&skip=0   (admin)
exports.getLogs = async (req, res) => {
  try {
    const group = req.query.group;
    const filter = {};
    if (group === 'security') filter.type = { $in: SECURITY_TYPES };
    if (group === 'audit') filter.type = { $nin: SECURITY_TYPES };

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const [logs, total, weekAgg] = await Promise.all([
      SecurityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SecurityLog.countDocuments(filter),
      SecurityLog.aggregate([
        {
          $match: {
            type: { $in: SECURITY_TYPES },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const week = {};
    weekAgg.forEach((w) => {
      week[w._id] = w.count;
    });

    res.json({ logs, total, week });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/security/locked   (admin) -> abhi lock wale accounts
exports.getLocked = async (req, res) => {
  try {
    const users = await User.find({ lockUntil: { $gt: new Date() } })
      .select('name email role rollNo department semester lockUntil')
      .lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/security/unlock/:id   (admin)
exports.unlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0 }, $unset: { lockUntil: 1 } });
    logEvent('login_unlock', req.user.name + ' unlocked the account of ' + user.name + ' (' + user.email + ')', {
      req,
    });
    res.json({ message: 'Account unlock ho gaya' });
  } catch (err) {
    res.status(400).json({ message: 'ID sahi nahi hai' });
  }
};

// GET /api/security/settings   (admin)
exports.getSettingsHandler = async (req, res) => {
  try {
    res.json({ settings: await getSettings() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/security/settings   (admin)
exports.updateSettingsHandler = async (req, res) => {
  try {
    const patch = {};
    const { geoEnabled, radiusMeters, autoAlerts, bioRequired } = req.body;

    if (geoEnabled !== undefined) patch.geoEnabled = !!geoEnabled;
    if (autoAlerts !== undefined) patch.autoAlerts = !!autoAlerts;
    if (bioRequired !== undefined) patch.bioRequired = !!bioRequired;
    if (radiusMeters !== undefined) {
      const r = Number(radiusMeters);
      if (!Number.isInteger(r) || r < 30 || r > 2000) {
        return res.status(400).json({ message: 'Radius 30 se 2000 meter ke beech ka poora number ho' });
      }
      patch.radiusMeters = r;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'Kuch badalna to hai' });
    }

    const settings = await saveSettings(patch);
    logEvent('settings_update', req.user.name + ' changed settings: ' + JSON.stringify(patch), { req });
    res.json({ message: 'Settings save ho gayi', settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};