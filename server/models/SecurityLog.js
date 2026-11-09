const mongoose = require('mongoose');

// Suspicious activity + audit log (kisne kya badla) ek hi jagah
const securityLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    level: { type: String, enum: ['info', 'warn'], default: 'info' },
    message: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    actorRole: String,
    ip: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

securityLogSchema.index({ type: 1, createdAt: -1 });
securityLogSchema.index({ createdAt: -1 });
// 180 din baad purane log apne aap hat jayenge (database bhar na jaye)
securityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);