const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { verifyQrToken } = require('./sessionController');

// POST /api/attendance/mark   body: { token, deviceId }   (student)
exports.markAttendance = async (req, res) => {
  try {
    const { token, deviceId } = req.body;

    if (!token || !deviceId) {
      return res.status(400).json({ message: 'token aur deviceId zaroori hai' });
    }

    // Token ke andar se session ID nikalo (abhi verify nahi kiya, bas padha)
    const payload = jwt.decode(token);
    if (!payload || !payload.sid) {
      return res.status(400).json({ message: 'Ye sahi QR nahi hai' });
    }

    const session = await Session.findById(payload.sid).select('+qrSecret');
    if (!session) {
      return res.status(404).json({ message: 'Session nahi mila' });
    }
    if (!session.isActive) {
      return res.status(400).json({ message: 'Ye class ka session band ho chuka hai' });
    }

    // Ab asli verify: signature sahi hai aur 30 sec ke andar hai ya nahi
    try {
      verifyQrToken(token, session.qrSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'QR expire ho gaya, naya QR scan karo' });
      }
      return res.status(400).json({ message: 'QR sahi nahi hai' });
    }

    // Student isi subject ke department aur semester ka hona chahiye
    const subject = await Subject.findById(session.subject);
    if (
      !subject ||
      subject.department !== req.user.department ||
      subject.semester !== req.user.semester
    ) {
      return res.status(403).json({ message: 'Ye subject tumhare class ka nahi hai' });
    }

    const attendance = await Attendance.create({
      session: session._id,
      subject: subject._id,
      student: req.user._id,
      deviceId,
    });

    res.status(201).json({
      message: 'Attendance lag gayi',
      subject: subject.name,
      markedAt: attendance.markedAt,
    });
  } catch (err) {
    // Duplicate key: unique index ne rok diya
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.deviceId) {
        return res
          .status(400)
          .json({ message: 'Is device se is session me pehle hi attendance lag chuki hai' });
      }
      return res.status(400).json({ message: 'Tumhari attendance pehle hi lag chuki hai' });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/me   (student)
// Subject-wise attendance percentage
exports.getMyAttendance = async (req, res) => {
  try {
    const { department, semester, _id } = req.user;

    const subjects = await Subject.find({ department, semester }).sort({ name: 1 });

    const report = await Promise.all(
      subjects.map(async (subject) => {
        const totalClasses = await Session.countDocuments({ subject: subject._id });
        const attended = await Attendance.countDocuments({
          student: _id,
          subject: subject._id,
          status: 'present',
        });
        const percentage =
          totalClasses === 0 ? 0 : Math.round((attended / totalClasses) * 1000) / 10;

        return {
          subjectId: subject._id,
          subject: subject.name,
          code: subject.code,
          totalClasses,
          attended,
          percentage,
          atRisk: totalClasses > 0 && percentage < 75,
        };
      })
    );

    res.json({ count: report.length, report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};