const mongoose = require('mongoose');

// Student ke phone ka fingerprint/face lock (WebAuthn). Asli fingerprint kahin save nahi hota,
// sirf phone ki public key rakhi jaati hai.
const credentialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    credentialId: { type: String, required: true, unique: true },
    publicKeyJwk: { type: mongoose.Schema.Types.Mixed, required: true },
    alg: { type: Number, required: true },
    signCount: { type: Number, default: 0 },
    // Kis site ke naam par bana (jaise smart-attendance-z7vj.onrender.com)
    rpId: { type: String, required: true },
    transports: [String],
    label: { type: String, default: 'Phone' },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Credential', credentialSchema);