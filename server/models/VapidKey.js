const mongoose = require('mongoose');

// Notification bhejne ki chabhi (VAPID). Pehli baar apne aap ban kar yaha save hoti hai,
// isliye Render me kuch set nahi karna padta.
const vapidSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
});

module.exports = mongoose.model('VapidKey', vapidSchema);