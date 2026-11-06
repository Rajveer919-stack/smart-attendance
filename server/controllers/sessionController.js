const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Session = require('../models/Session');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// QR kitni der valid rahega (seconds)
const QR_VALIDITY_SECONDS = 30;

// Naya rotating token banata hai. Is token ko QR me daalte hai
const generateQrToken = (sessionId, qrSecret) =>
  jwt.sign({ sid: String(sessionId) }, qrSecret, { expiresIn: QR_VALIDITY_SECONDS });

// Attendance mark karte time ye use hota hai
const verifyQrToken = (token, qrSecret) => jwt.verify(token, qrSecret);

// POST /api/sessions/start   body: { subjectId }
exports.startSession = async (req, res) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId zaroori hai' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject nahi mila' });

    if (String(subject.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ye subject tumhara nahi hai' });
    }

    // Is subject ka koi purana active session ho toh band kar do
    await Session.updateMany(
      { subject: subject._id, teacher: req.user._id, isActive: true },
      { isActive: false, endTime: new Date() }
    );

    const qrSecret = crypto.randomBytes(32).toString('hex');
    const session = await Session.create({
      subject: subject._id,
      teacher: req.user._id,
      qrSecret,
    });

    res.status(201).json({
      session: {
        id: session._id,
        subject: subject.name,
        startTime: session.startTime,
        isActive: session.isActive,
      },
      qrValiditySeconds: QR_VALIDITY_SECONDS,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sessions/:id/qr
// Teacher ka screen har ~20 sec me ye call karega aur naya QR dikhayega
exports.getQr = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).select('+qrSecret');
    if (!session) return res.status(404).json({ message: 'Session nahi mila' });

    if (String(session.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ye session tumhara nahi hai' });
    }
    if (!session.isActive) {
      return res.status(400).json({ message: 'Ye session band ho chuka hai' });
    }

    const token = generateQrToken(session._id, session.qrSecret);
    const qrImage = await QRCode.toDataURL(token, { width: 320, margin: 1 });

    res.json({
      sessionId: session._id,
      token,
      qrImage, // <img src={qrImage} /> me seedha laga sakte ho
      expiresInSeconds: QR_VALIDITY_SECONDS,
    });
  } catch (err) {
    res.status(400).json({ message: 'Session ID sahi nahi hai' });
  }
};

// POST /api/sessions/:id/end
exports.endSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session nahi mila' });

    if (String(session.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ye session tumhara nahi hai' });
    }

    session.isActive = false;
    session.endTime = new Date();
    await session.save();

    res.json({ message: 'Session band ho gaya', endTime: session.endTime });
  } catch (err) {
    res.status(400).json({ message: 'Session ID sahi nahi hai' });
  }
};

// GET /api/sessions   -> teacher ke apne sessions (latest pehle)
exports.getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ teacher: req.user._id })
      .populate('subject', 'name code')
      .sort({ startTime: -1 })
      .limit(50);
    res.json({ count: sessions.length, sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sessions/:id/attendance
// Is class me kaun present hai aur kaun absent (naam aur roll number ke saath)
exports.getSessionAttendance = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session nahi mila' });

    if (String(session.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ye session tumhara nahi hai' });
    }

    const subject = await Subject.findById(session.subject);
    const students = await User.find({
      role: 'student',
      department: subject.department,
      semester: subject.semester,
    }).sort({ rollNo: 1, name: 1 });

    const records = await Attendance.find({ session: session._id });
    const markedAt = {};
    records.forEach((r) => {
      markedAt[String(r.student)] = r.markedAt;
    });

    const list = students.map((s) => ({
      studentId: s._id,
      name: s.name,
      rollNo: s.rollNo,
      status: markedAt[String(s._id)] ? 'present' : 'absent',
      markedAt: markedAt[String(s._id)] || null,
    }));

    const presentCount = list.filter((s) => s.status === 'present').length;

    res.json({
      sessionId: session._id,
      isActive: session.isActive,
      subject: subject.name,
      total: list.length,
      presentCount,
      absentCount: list.length - presentCount,
      students: list,
    });
  } catch (err) {
    res.status(400).json({ message: 'Session ID sahi nahi hai' });
  }
};

exports.verifyQrToken = verifyQrToken;