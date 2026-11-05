const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    // Har session ka apna secret. QR token isi se sign hota hai, isliye dusre session ka QR kaam nahi karega
    qrSecret: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);