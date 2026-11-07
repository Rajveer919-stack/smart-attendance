const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MAX_ROLL } = require('../config/classes');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
    // Roll number sirf number hota hai (1 se 300), taki list 1,2,3... serial me sort ho
    rollNo: {
      type: Number,
      min: [1, 'Roll number 1 se 300 ke beech hona chahiye'],
      max: [MAX_ROLL, 'Roll number 1 se 300 ke beech hona chahiye'],
      validate: { validator: Number.isInteger, message: 'Roll number poora number hona chahiye' },
    },
    department: { type: String, trim: true },
    semester: { type: Number, min: 1, max: 8 },
  },
  { timestamps: true }
);

// Ek class (department + semester) me ek roll number sirf ek student ka ho sakta hai.
// Ye index class-wise list ko sorted aur fast bhi rakhta hai (500+ students ke liye).
userSchema.index(
  { role: 1, department: 1, semester: 1, rollNo: 1 },
  { unique: true, partialFilterExpression: { role: 'student', rollNo: { $exists: true } } }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  // OTP verify ke baad password pehle se hash hota hai, dobara hash nahi karna
  if (this.$locals && this.$locals.skipHash) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);