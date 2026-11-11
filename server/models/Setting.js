const mongoose = require('mongoose');

// Poore system ki settings. Database me bas ek hi document hota hai (key: 'main')
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    // Location check: student teacher ke phone ke paas ho tabhi attendance lage
    geoEnabled: { type: Boolean, default: false },
    radiusMeters: { type: Number, default: 150, min: 30, max: 2000 },
    // Class khatam hone par kam attendance wale students ko apne aap email
    autoAlerts: { type: Boolean, default: false },
    // Fingerprint/face lock sabke liye zaroori (ON ho to bina lock ke attendance nahi lagegi)
    bioRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);