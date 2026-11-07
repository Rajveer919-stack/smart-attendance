const mongoose = require('mongoose');

// Email OTP ka temporary record. Registration ka data bhi yahi tab tak rehta hai jab tak OTP verify na ho.
// expiresAt par TTL index hai, isliye purane OTP MongoDB khud delete kar deta hai.
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['register', 'reset'], required: true },
  codeHash: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);