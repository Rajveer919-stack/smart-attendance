const Subject = require('../models/Subject');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// India ka samay (IST = UTC + 5:30). Din ki ginti isi se hoti hai
const IST_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 2026-11-08T10:00Z -> '2026-11-08' (IST ke hisaab se)
const dayKey = (date) => new Date(new Date(date).getTime() + IST_MS).toISOString().slice(0, 10);
// IST ke hisaab se 'HH:mm'
const timeKey = (date) => new Date(new Date(date).getTime() + IST_MS).toISOString().slice(11, 16);
const prettyDay = (key) => key.slice(8, 10) + ' ' + MONTH_NAMES[Number(key.slice(5, 7)) - 1];
const round1 = (n) => Math.round(n * 10) / 10;
const percent = (part, whole) => (whole > 0 ? round1((part / whole) * 100) : 0);

// ?from=2026-11-01&to=2026-11-30 se date range banata hai (dono optional)
function parseRange(from, to) {
  const range = {};
  if (from && DATE_RE.test(from)) range.$gte = new Date(from + 'T00:00:00+05:30');
  if (to && DATE_RE.test(to)) range.$lte = new Date(to + 'T23:59:59.999+05:30');
  return range.$gte || range.$lte ? range : null;
}

// Subject load karta hai aur dekhta hai ki ye banda use dekh sakta hai ya nahi
async function loadSubject(req, res) {
  const subject = await Subject.findById(req.params.subjectId);
  if (!subject) {
    res.status(404).json({ message: 'Subject nahi mila' });
    return null;
  }
  // Teacher sirf apna subject dekh sakta hai, admin sab
  if (req.user.role === 'teacher' && String(subject.teacher) !== String(req.user._id)) {
    res.status(403).json({ message: 'Ye subject tumhara nahi hai' });
    return null;
  }
  return subject;
}

// Ek subject ka poora hisaab (date range ke saath ya bina)
async function buildSubjectReport(subject, range) {
  const sessionFilter = { subject: subject._id };
  if (range) sessionFilter.startTime = range;

  const sessions = await Session.find(sessionFilter).select('_id startTime isActive').sort({ startTime: 1 });
  const sessionIds = sessions.map((s) => s._id);
  const totalClasses = sessions.length;

  const students = await User.find({
    role: 'student',
    department: subject.department,
    semester: subject.semester,
  }).sort({ rollNo: 1, name: 1 });

  const counts = await Attendance.aggregate([
    { $match: { session: { $in: sessionIds }, status: 'present' } },
    { $group: { _id: '$student', attended: { $sum: 1 } } },
  ]);
  const attendedMap = {};
  counts.forEach((c) => {
    attendedMap[String(c._id)] = c.attended;
  });

  const report = students.map((s) => {
    const attended = attendedMap[String(s._id)] || 0;
    const pct = percent(attended, totalClasses);
    return {
      studentId: s._id,
      name: s.name,
      email: s.email,
      rollNo: s.rollNo,
      attended,
      totalClasses,
      percentage: pct,
      atRisk: totalClasses > 0 && pct < 75,
    };
  });

  const riskStudents = report.filter((r) => r.atRisk);
  const classAverage =
    report.length === 0 ? 0 : round1(report.reduce((sum, r) => sum + r.percentage, 0) / report.length);

  return { sessions, sessionIds, students, report, riskStudents, totalClasses, classAverage };
}

// GET /api/analytics/subject/:subjectId?from=&to=   (teacher ya admin)
// Poori class ka attendance + 75% se neeche wale students
exports.getSubjectReport = async (req, res) => {
  try {
    const subject = await loadSubject(req, res);
    if (!subject) return;

    const range = parseRange(req.query.from, req.query.to);
    const r = await buildSubjectReport(subject, range);

    res.json({
      subject: { id: subject._id, name: subject.name, code: subject.code },
      from: req.query.from || '',
      to: req.query.to || '',
      totalClasses: r.totalClasses,
      totalStudents: r.report.length,
      classAverage: r.classAverage,
      riskCount: r.riskStudents.length,
      riskStudents: r.riskStudents,
      report: r.report,
    });
  } catch (err) {
    res.status(400).json({ message: 'Subject ID sahi nahi hai' });
  }
};

// GET /api/analytics/subject/:subjectId/daily?from=&to=   (teacher ya admin)
// Din-din ki list: kis din kitne present the (latest pehle)
exports.getSubjectDaily = async (req, res) => {
  try {
    const subject = await loadSubject(req, res);
    if (!subject) return;

    const range = parseRange(req.query.from, req.query.to);
    const r = await buildSubjectReport(subject, range);

    const presentAgg = await Attendance.aggregate([
      { $match: { session: { $in: r.sessionIds }, status: 'present' } },
      { $group: { _id: '$session', present: { $sum: 1 } } },
    ]);
    const presentMap = {};
    presentAgg.forEach((p) => {
      presentMap[String(p._id)] = p.present;
    });

    const total = r.students.length;
    const days = r.sessions
      .map((s) => {
        const present = presentMap[String(s._id)] || 0;
        return {
          sessionId: s._id,
          date: dayKey(s.startTime),
          time: timeKey(s.startTime),
          isActive: s.isActive,
          present,
          absent: total - present,
          total,
          percentage: percent(present, total),
        };
      })
      .reverse();

    res.json({ subject: { id: subject._id, name: subject.name, code: subject.code }, days });
  } catch (err) {
    res.status(400).json({ message: 'Subject ID sahi nahi hai' });
  }
};

// GET /api/analytics/subject/:subjectId/export?from=&to=   (teacher ya admin)
// Excel file: ek sheet me summary, doosri me din-wise P/A
exports.exportSubjectExcel = async (req, res) => {
  try {
    const subject = await loadSubject(req, res);
    if (!subject) return;

    const ExcelJS = require('exceljs');
    const range = parseRange(req.query.from, req.query.to);
    const r = await buildSubjectReport(subject, range);

    const presentRows = await Attendance.find({
      session: { $in: r.sessionIds },
      status: 'present',
    })
      .select('session student')
      .lean();
    const presentSet = new Set(presentRows.map((p) => String(p.session) + '|' + String(p.student)));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Smart Attendance';
    wb.created = new Date();

    const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    const headFont = { bold: true, color: { argb: 'FFFFFFFF' } };
    const red = { argb: 'FFDC2626' };

    // ---- Sheet 1: Summary ----
    const ws = wb.addWorksheet('Summary');
    ws.addRow([subject.name + ' (' + subject.code + ')']).font = { bold: true, size: 14 };
    ws.addRow(['Department', subject.department, 'Semester', subject.semester]);
    ws.addRow([
      'Period',
      (req.query.from || 'Start') + '  to  ' + (req.query.to || 'Today'),
      'Classes held',
      r.totalClasses,
    ]);
    ws.addRow(['Class average', r.classAverage + '%', 'Below 75%', r.riskStudents.length]);
    ws.addRow([]);

    const head = ws.addRow(['Roll No', 'Name', 'Email', 'Attended', 'Total classes', 'Absent', 'Percentage', 'Status']);
    head.eachCell((cell) => {
      cell.fill = headFill;
      cell.font = headFont;
    });
    r.report.forEach((s) => {
      const row = ws.addRow([
        s.rollNo || '',
        s.name,
        s.email,
        s.attended,
        s.totalClasses,
        s.totalClasses - s.attended,
        s.percentage / 100,
        s.atRisk ? 'Below 75%' : 'OK',
        ]);
      row.getCell(7).numFmt = '0.0%';
      if (s.atRisk) row.eachCell((cell) => (cell.font = { color: red }));
    });
    [10, 26, 30, 11, 14, 10, 12, 12].forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });
    ws.views = [{ state: 'frozen', ySplit: 6 }];

    // ---- Sheet 2: Day-wise (P / A) ----
    const wd = wb.addWorksheet('Day-wise');
    const dayHead = ['Roll No', 'Name'];
    r.sessions.forEach((s) => dayHead.push(prettyDay(dayKey(s.startTime)) + ' ' + timeKey(s.startTime)));
    dayHead.push('Attended', 'Percentage');
    const hrow = wd.addRow(dayHead);
    hrow.eachCell((cell) => {
      cell.fill = headFill;
      cell.font = headFont;
      cell.alignment = { horizontal: 'center', wrapText: true };
    });
    r.report.forEach((s) => {
      const cells = [s.rollNo || '', s.name];
      r.sessions.forEach((sess) => {
        cells.push(presentSet.has(String(sess._id) + '|' + String(s.studentId)) ? 'P' : 'A');
      });
      cells.push(s.attended, s.percentage / 100);
      const row = wd.addRow(cells);
      row.getCell(cells.length).numFmt = '0.0%';
      for (let i = 0; i < r.sessions.length; i += 1) {
        const cell = row.getCell(3 + i);
        cell.alignment = { horizontal: 'center' };
        cell.font = { color: cell.value === 'P' ? { argb: 'FF15803D' } : red, bold: true };
      }
    });
    wd.getColumn(1).width = 10;
    wd.getColumn(2).width = 26;
    for (let i = 0; i < r.sessions.length; i += 1) wd.getColumn(3 + i).width = 13;
    wd.getColumn(3 + r.sessions.length).width = 11;
    wd.getColumn(4 + r.sessions.length).width = 12;
    wd.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

    const safe = String(subject.code).replace(/[^A-Za-z0-9_-]/g, '');
    const fileName = 'attendance-' + safe + '-' + dayKey(new Date()) + '.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(400).json({ message: 'Excel nahi ban payi' });
    else res.end();
  }
};

// GET /api/analytics/overview   (sirf admin)
// Dashboard ke charts ka saara data
exports.getOverview = async (req, res) => {
  try {
    const [subjects, sessionAgg, presentAgg, classAgg, students] = await Promise.all([
      Subject.find().select('name code department semester').lean(),
      Session.aggregate([{ $group: { _id: '$subject', count: { $sum: 1 } } }]),
      Attendance.aggregate([
        { $match: { status: 'present' } },
        { $group: { _id: '$subject', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: 'student' } },
        { $group: { _id: { department: '$department', semester: '$semester' }, count: { $sum: 1 } } },
      ]),
      User.find({ role: 'student' }).select('name rollNo department semester').lean(),
    ]);

    const sessionsBySubject = {};
    sessionAgg.forEach((s) => {
      sessionsBySubject[String(s._id)] = s.count;
    });
    const presentBySubject = {};
    presentAgg.forEach((p) => {
      presentBySubject[String(p._id)] = p.count;
    });
    const classSize = {};
    classAgg.forEach((c) => {
      classSize[c._id.department + '|' + c._id.semester] = c.count;
    });

    // ---- Department-wise ----
    const deptMap = {};
    classAgg.forEach((c) => {
      const d = c._id.department || '-';
      if (!deptMap[d]) deptMap[d] = { department: d, students: 0, classes: 0, present: 0, expected: 0 };
      deptMap[d].students += c.count;
    });
    // Class (department + semester) ke total sessions, student-wise hisaab ke liye
    const classSessions = {};
    const subjectStats = [];
    subjects.forEach((sub) => {
      const key = sub.department + '|' + sub.semester;
      const held = sessionsBySubject[String(sub._id)] || 0;
      const present = presentBySubject[String(sub._id)] || 0;
      const size = classSize[key] || 0;
      classSessions[key] = (classSessions[key] || 0) + held;
      if (!deptMap[sub.department]) {
        deptMap[sub.department] = { department: sub.department, students: 0, classes: 0, present: 0, expected: 0 };
      }
      const d = deptMap[sub.department];
      d.classes += held;
      d.present += present;
      d.expected += held * size;
      if (held > 0 && size > 0) {
        subjectStats.push({
          name: sub.name,
          code: sub.code,
          department: sub.department,
          semester: sub.semester,
          classes: held,
          percentage: percent(present, held * size),
        });
      }
    });
    const departments = Object.values(deptMap)
      .map((d) => ({
        department: d.department,
        students: d.students,
        classes: d.classes,
        percentage: percent(d.present, d.expected),
      }))
      .sort((a, b) => a.department.localeCompare(b.department));

    // ---- Pichhle 14 din ka trend ----
    const todayKey = dayKey(new Date());
    const dayList = [];
    for (let i = 13; i >= 0; i -= 1) {
      dayList.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
    }
    const since = new Date(dayList[0] + 'T00:00:00+05:30');
    const recentSessions = await Session.find({ startTime: { $gte: since } })
      .select('_id subject startTime')
      .lean();
    const recentIds = recentSessions.map((s) => s._id);
    const recentPresent = await Attendance.aggregate([
      { $match: { session: { $in: recentIds }, status: 'present' } },
      { $group: { _id: '$session', count: { $sum: 1 } } },
    ]);
    const presentBySession = {};
    recentPresent.forEach((p) => {
      presentBySession[String(p._id)] = p.count;
    });
    const subjectById = {};
    subjects.forEach((s) => {
      subjectById[String(s._id)] = s;
    });
    const trendMap = {};
    dayList.forEach((k) => {
      trendMap[k] = { date: k, label: prettyDay(k), classes: 0, present: 0, expected: 0 };
    });
    recentSessions.forEach((s) => {
      const t = trendMap[dayKey(s.startTime)];
      if (!t) return;
      const sub = subjectById[String(s.subject)];
      t.classes += 1;
      t.present += presentBySession[String(s._id)] || 0;
      t.expected += sub ? classSize[sub.department + '|' + sub.semester] || 0 : 0;
    });
    const trend = dayList.map((k) => ({
      date: k,
      label: trendMap[k].label,
      classes: trendMap[k].classes,
      percentage: trendMap[k].expected > 0 ? percent(trendMap[k].present, trendMap[k].expected) : null,
    }));

    // ---- Kam attendance wale students ----
    const attendedAgg = await Attendance.aggregate([
      { $match: { status: 'present' } },
      { $group: { _id: '$student', attended: { $sum: 1 } } },
    ]);
    const attendedByStudent = {};
    attendedAgg.forEach((a) => {
      attendedByStudent[String(a._id)] = a.attended;
    });
    const rated = [];
    students.forEach((s) => {
      const total = classSessions[s.department + '|' + s.semester] || 0;
      if (total === 0) return;
      rated.push({
        studentId: s._id,
        name: s.name,
        rollNo: s.rollNo,
        department: s.department,
        semester: s.semester,
        percentage: percent(attendedByStudent[String(s._id)] || 0, total),
      });
    });
    const lowCount = rated.filter((s) => s.percentage < 75).length;
    const lowest = rated
      .filter((s) => s.percentage < 75)
      .sort((a, b) => a.percentage - b.percentage || (a.rollNo || 0) - (b.rollNo || 0))
      .slice(0, 8);

    const totalPresent = presentAgg.reduce((sum, p) => sum + p.count, 0);
    let totalExpected = 0;
    Object.values(deptMap).forEach((d) => {
      totalExpected += d.expected;
    });
    const todayClasses = recentSessions.filter((s) => dayKey(s.startTime) === todayKey).length;

    res.json({
      totals: {
        students: students.length,
        subjects: subjects.length,
        classesHeld: sessionAgg.reduce((sum, s) => sum + s.count, 0),
        todayClasses,
        overallPercentage: percent(totalPresent, totalExpected),
        lowCount,
      },
      departments,
      trend,
      weakSubjects: subjectStats.sort((a, b) => a.percentage - b.percentage).slice(0, 6),
      lowest,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/calendar/:subjectId?month=2026-11   (student)
// Is mahine ki din-din ki attendance (calendar ke liye)
exports.getStudentCalendar = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (
      !subject ||
      subject.department !== req.user.department ||
      subject.semester !== req.user.semester
    ) {
      return res.status(403).json({ message: 'Ye subject tumhare class ka nahi hai' });
    }

    const month = MONTH_RE.test(req.query.month || '') ? req.query.month : dayKey(new Date()).slice(0, 7);
    const year = Number(month.slice(0, 4));
    const mon = Number(month.slice(5, 7));
    const nextMonth = mon === 12 ? String(year + 1) + '-01' : String(year) + '-' + String(mon + 1).padStart(2, '0');

    const sessions = await Session.find({
      subject: subject._id,
      startTime: {
        $gte: new Date(month + '-01T00:00:00+05:30'),
        $lt: new Date(nextMonth + '-01T00:00:00+05:30'),
      },
    })
      .select('_id startTime isActive')
      .sort({ startTime: 1 })
      .lean();

    const records = await Attendance.find({
      student: req.user._id,
      session: { $in: sessions.map((s) => s._id) },
      status: 'present',
    })
      .select('session')
      .lean();
    const presentSet = new Set(records.map((r) => String(r.session)));

    const days = {};
    let attended = 0;
    sessions.forEach((s) => {
      const present = presentSet.has(String(s._id));
      if (present) attended += 1;
      const key = dayKey(s.startTime);
      if (!days[key]) days[key] = [];
      days[key].push({
        time: timeKey(s.startTime),
        status: present ? 'present' : s.isActive ? 'live' : 'absent',
      });
    });

    res.json({
      subject: { id: subject._id, name: subject.name, code: subject.code },
      month,
      daysInMonth: new Date(Date.UTC(year, mon, 0)).getUTCDate(),
      firstWeekday: new Date(Date.UTC(year, mon - 1, 1)).getUTCDay(), // 0 = Sunday
      today: dayKey(new Date()),
      days,
      held: sessions.length,
      attended,
      percentage: percent(attended, sessions.length),
    });
  } catch (err) {
    res.status(400).json({ message: 'Subject ID sahi nahi hai' });
  }
};

// Alert controller bhi ye use karta hai
exports.buildSubjectReport = buildSubjectReport;
exports.loadSubject = loadSubject;