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
    // Class shuru karte waqt teacher ke phone ki location (student isi ke paas hone chahiye)
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
    },
    // Class band hone ke baad kitni baar dobara kholi gayi (late students ke liye)
    reopenCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Teacher ki haal ki classes aur "chalti class" jaldi milne ke liye
sessionSchema.index({ teacher: 1, startTime: -1 });
sessionSchema.index({ subject: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);