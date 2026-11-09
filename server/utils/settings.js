const Setting = require('../models/Setting');

// Settings har scan par padhni padti hai, isliye 15 second ke liye yaad rakhte hai
let cache = null;
let cachedAt = 0;
const TTL_MS = 15 * 1000;

async function getSettings() {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  const doc = await Setting.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  cache = {
    geoEnabled: !!doc.geoEnabled,
    radiusMeters: doc.radiusMeters || 150,
    autoAlerts: !!doc.autoAlerts,
  };
  cachedAt = Date.now();
  return cache;
}

async function saveSettings(patch) {
  await Setting.findOneAndUpdate({ key: 'main' }, { $set: patch }, { upsert: true, setDefaultsOnInsert: true });
  cache = null;
  return getSettings();
}

module.exports = { getSettings, saveSettings };