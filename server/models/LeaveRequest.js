const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Request ke waqt student ki class (teacher ko isi se dikhegi)
    department: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    // Din 'YYYY-MM-DD' (IST) ke roop me
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

leaveSchema.index({ student: 1, createdAt: -1 });
leaveSchema.index({ department: 1, semester: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveRequest', leaveSchema);