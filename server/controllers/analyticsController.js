const Subject = require('../models/Subject');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// GET /api/analytics/subject/:subjectId   (teacher ya admin)
// Poori class ka attendance + 75% se neeche wale students
exports.getSubjectReport = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject nahi mila' });

    // Teacher sirf apna subject dekh sakta hai, admin sab
    if (req.user.role === 'teacher' && String(subject.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ye subject tumhara nahi hai' });
    }

    const students = await User.find({
      role: 'student',
      department: subject.department,
      semester: subject.semester,
    }).sort({ rollNo: 1, name: 1 });

    const totalClasses = await Session.countDocuments({ subject: subject._id });

    // Har student ki kitni attendance lagi
    const counts = await Attendance.aggregate([
      { $match: { subject: subject._id, status: 'present' } },
      { $group: { _id: '$student', attended: { $sum: 1 } } },
    ]);
    const attendedMap = {};
    counts.forEach((c) => {
      attendedMap[String(c._id)] = c.attended;
    });

    const report = students.map((s) => {
      const attended = attendedMap[String(s._id)] || 0;
      const percentage =
        totalClasses === 0 ? 0 : Math.round((attended / totalClasses) * 1000) / 10;
      return {
        studentId: s._id,
        name: s.name,
        rollNo: s.rollNo,
        attended,
        totalClasses,
        percentage,
        atRisk: totalClasses > 0 && percentage < 75,
      };
    });

    const riskStudents = report.filter((r) => r.atRisk);
    const classAverage =
      report.length === 0
        ? 0
        : Math.round((report.reduce((sum, r) => sum + r.percentage, 0) / report.length) * 10) / 10;

    res.json({
      subject: { id: subject._id, name: subject.name, code: subject.code },
      totalClasses,
      totalStudents: report.length,
      classAverage,
      riskCount: riskStudents.length,
      riskStudents,
      report,
    });
  } catch (err) {
    res.status(400).json({ message: 'Subject ID sahi nahi hai' });
  }
};