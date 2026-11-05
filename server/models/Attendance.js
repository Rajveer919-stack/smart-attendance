const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    markedAt: { type: Date, default: Date.now },
    // Proxy rokne ke liye: ek device se ek session me ek hi student
    deviceId: { type: String, required: true },
  },
  { timestamps: true }
);

// Ek student ek session me sirf ek baar attendance laga sakta hai
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

// Ek device se ek session me sirf ek hi attendance (proxy block)
attendanceSchema.index({ session: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);