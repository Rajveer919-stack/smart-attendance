const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { verifyQrToken } = require('./sessionController');
const { getSettings } = require('../utils/settings');
const { distanceMeters, isValidCoord } = require('../utils/geo');
const { logEvent } = require('../utils/audit');

const who = (u) => u.name + ' (roll ' + (u.rollNo || '-') + ')';

// POST /api/attendance/mark   body: { token, deviceId, lat, lng, accuracy }   (student)
exports.markAttendance = async (req, res) => {
  let session = null;
  let subject = null;
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

    session = await Session.findById(payload.sid).select('+qrSecret');
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
    subject = await Subject.findById(session.subject);
    if (
      !subject ||
      subject.department !== req.user.department ||
      subject.semester !== req.user.semester
    ) {
      return res.status(403).json({ message: 'Ye subject tumhare class ka nahi hai' });
    }

    // Location check: student teacher ke phone ke paas hona chahiye
    let distanceM;
    const settings = await getSettings();
    if (settings.geoEnabled && session.location && typeof session.location.lat === 'number') {
      const lat = typeof req.body.lat === 'number' ? req.body.lat : NaN;
      const lng = typeof req.body.lng === 'number' ? req.body.lng : NaN;
      const accuracy = typeof req.body.accuracy === 'number' ? req.body.accuracy : 0;

      if (!isValidCoord(lat, lng)) {
        logEvent(
          'no_location',
          who(req.user) + ' tried to mark ' + subject.name + ' without sharing location',
          { level: 'warn', req }
        );
        return res
          .status(400)
          .json({ message: 'Phone ki location ON karo aur allow karo, tabhi attendance lagegi' });
      }

      const d = distanceMeters(session.location, { lat, lng });
      distanceM = Math.round(d);
      // GPS ki galti ka thoda fayda (max 50 meter) student ko dete hai
      const effective = Math.max(0, d - Math.min(Math.max(accuracy, 0), 50));
      if (effective > settings.radiusMeters) {
        logEvent(
          'out_of_range',
          who(req.user) + ' tried to mark ' + subject.name + ' from ' + distanceM + ' m away (limit ' +
            settings.radiusMeters + ' m)',
          { level: 'warn', req, meta: { distanceM, accuracy } }
        );
        return res.status(403).json({
          message: 'Tum class se ' + distanceM + ' meter door ho. Class ke paas aakar scan karo',
        });
      }
    }

    const attendance = await Attendance.create({
      session: session._id,
      subject: subject._id,
      student: req.user._id,
      deviceId,
      distanceM,
    });

    // Ek hi phone se alag-alag students ki attendance lagti ho to likh lo
    try {
      const sharing = await Attendance.distinct('student', { deviceId });
      if (sharing.length > 1) {
        const first = await Attendance.countDocuments({ student: req.user._id, deviceId });
        if (first === 1) {
          logEvent(
            'shared_device',
            'The phone used by ' + who(req.user) + ' has also been used by ' + (sharing.length - 1) +
              ' other student(s)',
            { level: 'warn', req, meta: { deviceId } }
          );
        }
      }
    } catch {
      // ye sirf nigrani hai, attendance par asar nahi
    }

    res.status(201).json({
      message: 'Attendance lag gayi',
      subject: subject.name,
      markedAt: attendance.markedAt,
    });
  } catch (err) {
    // Duplicate key: unique index ne rok diya
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.deviceId) {
        // Dusre student ne ye phone pehle hi is session me use kar liya hai
        try {
          const other = await Attendance.findOne({ session: session._id, deviceId: req.body.deviceId })
            .populate('student', 'name rollNo')
            .lean();
          logEvent(
            'device_reuse',
            who(req.user) + ' tried to mark ' + (subject ? subject.name : 'a class') +
              ' from a phone already used by ' + (other && other.student ? who(other.student) : 'another student'),
            { level: 'warn', req }
          );
        } catch {
          // log na likh paye to bhi student ko jawab dena hai
        }
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