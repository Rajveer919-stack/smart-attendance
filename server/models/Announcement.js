const mongoose = require('mongoose');

// Teacher ka message apni class ke students ke liye
const announcementSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherName: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
  },
  { timestamps: true }
);

announcementSchema.index({ department: 1, semester: 1, createdAt: -1 });
announcementSchema.index({ teacher: 1, createdAt: -1 });
// 60 din baad purane announcements apne aap hat jayenge
announcementSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('Announcement', announcementSchema);