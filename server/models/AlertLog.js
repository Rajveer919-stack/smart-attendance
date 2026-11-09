const mongoose = require('mongoose');

// Kis student ko kis subject ki low attendance email kab gayi (baar-baar email na jaye)
const alertLogSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  percentage: Number,
  sentAt: { type: Date, default: Date.now },
});

alertLogSchema.index({ subject: 1, student: 1, sentAt: -1 });
alertLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AlertLog', alertLogSchema);