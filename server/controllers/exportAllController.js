const ExcelJS = require('exceljs');
const Subject = require('../models/Subject');
const { buildSubjectReport } = require('./analyticsController');

const IST_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dayKey = (date) => new Date(new Date(date).getTime() + IST_MS).toISOString().slice(0, 10);

function parseRange(from, to) {
  const range = {};
  if (from && DATE_RE.test(from)) range.$gte = new Date(from + 'T00:00:00+05:30');
  if (to && DATE_RE.test(to)) range.$lte = new Date(to + 'T23:59:59.999+05:30');
  return range.$gte || range.$lte ? range : null;
}

// Ek hi Excel me bahut saare subjects: kitne banenge uski seema (server par bojh na pade)
const MAX_SUBJECTS = 40;

// GET /api/analytics/export-all?from=&to=&department=&semester=   (teacher: apne subjects, admin: sab)
// Excel me 3 sheet: Subjects (har subject ka hisaab), Students (har student ka subject-wise %), Below 75%
exports.exportAllExcel = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'teacher') filter.teacher = req.user._id;
    if (req.query.department) filter.department = String(req.query.department).trim();
    const sem = Number(req.query.semester);
    if (Number.isInteger(sem) && sem >= 1 && sem <= 8) filter.semester = sem;

    const subjects = await Subject.find(filter).sort({ department: 1, semester: 1, name: 1 });
    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Is filter me koi subject nahi mila' });
    }
    if (subjects.length > MAX_SUBJECTS) {
      return res.status(400).json({
        message: 'Ek sath ' + MAX_SUBJECTS + ' se zyada subject nahi. Department ya semester chuno',
      });
    }

    const range = parseRange(req.query.from, req.query.to);

    // Subject ek-ek karke (server par ek sath bahut query na chale)
    const parts = [];
    for (const subject of subjects) {
      parts.push({ subject, r: await buildSubjectReport(subject, range) });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Smart Attendance';
    wb.created = new Date();
    const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    const headFont = { bold: true, color: { argb: 'FFFFFFFF' } };
    const red = { argb: 'FFDC2626' };
    const styleHead = (row) =>
      row.eachCell((cell) => {
        cell.fill = headFill;
        cell.font = headFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

    // ---- Sheet 1: Subjects ----
    const s1 = wb.addWorksheet('Subjects');
    s1.addRow(['Smart Attendance - all subjects']).font = { bold: true, size: 14 };
    s1.addRow(['Period', (req.query.from || 'Start') + '  to  ' + (req.query.to || 'Today')]);
    s1.addRow([]);
    styleHead(
      s1.addRow(['Subject', 'Code', 'Department', 'Semester', 'Classes held', 'Students', 'Class average', 'Below 75%'])
    );
    parts.forEach(({ subject, r }) => {
      const row = s1.addRow([
        subject.name,
        subject.code,
        subject.department,
        subject.semester,
        r.totalClasses,
        r.report.length,
        r.classAverage / 100,
        r.riskStudents.length,
      ]);
      row.getCell(7).numFmt = '0.0%';
      if (r.riskStudents.length > 0) row.getCell(8).font = { color: red, bold: true };
    });
    [28, 12, 14, 10, 13, 10, 14, 11].forEach((w, i) => (s1.getColumn(i + 1).width = w));
    s1.views = [{ state: 'frozen', ySplit: 4 }];

    // ---- Sheet 2: Students (class-wise, subject-wise %) ----
    // Har class (department + semester) ke apne subject hote hain, isliye class ke hisaab se alag block
    const s2 = wb.addWorksheet('Students');
    const classes = new Map();
    parts.forEach((p) => {
      const key = p.subject.department + '|' + p.subject.semester;
      if (!classes.has(key)) classes.set(key, []);
      classes.get(key).push(p);
    });
    classes.forEach((list) => {
      const { department, semester } = list[0].subject;
      const title = s2.addRow([department + '  -  Semester ' + semester]);
      title.font = { bold: true, size: 12 };
      const head = ['Roll No', 'Name', 'Email'];
      list.forEach(({ subject }) => head.push(subject.name + ' %'));
      head.push('Overall %');
      styleHead(s2.addRow(head));

      // Student ki list kisi bhi ek subject ke report se milti hai (class same hai)
      const byId = new Map();
      list.forEach(({ r }) => {
        r.report.forEach((s) => {
          if (!byId.has(String(s.studentId))) {
            byId.set(String(s.studentId), { rollNo: s.rollNo, name: s.name, email: s.email, pct: [], att: 0, tot: 0 });
          }
        });
      });
      list.forEach(({ r }, idx) => {
        r.report.forEach((s) => {
          const e = byId.get(String(s.studentId));
          e.pct[idx] = s.totalClasses > 0 ? s.percentage / 100 : '';
          e.att += s.attended;
          e.tot += s.totalClasses;
        });
      });
      Array.from(byId.values())
        .sort((a, b) => (a.rollNo || 9999) - (b.rollNo || 9999) || a.name.localeCompare(b.name))
        .forEach((e) => {
          const cells = [e.rollNo || '', e.name, e.email];
          list.forEach((_, idx) => cells.push(e.pct[idx] === undefined ? '' : e.pct[idx]));
          const overall = e.tot > 0 ? e.att / e.tot : '';
          cells.push(overall);
          const row = s2.addRow(cells);
          for (let i = 0; i <= list.length; i += 1) {
            const cell = row.getCell(4 + i);
            cell.numFmt = '0.0%';
            cell.alignment = { horizontal: 'center' };
            if (typeof cell.value === 'number' && cell.value < 0.75) cell.font = { color: red, bold: true };
          }
        });
      s2.addRow([]);
    });
    s2.getColumn(1).width = 10;
    s2.getColumn(2).width = 26;
    s2.getColumn(3).width = 30;
    for (let i = 4; i <= 4 + 12; i += 1) s2.getColumn(i).width = 16;

    // ---- Sheet 3: Below 75% (student + subject) ----
    const s3 = wb.addWorksheet('Below 75%');
    styleHead(
      s3.addRow(['Department', 'Semester', 'Subject', 'Roll No', 'Name', 'Email', 'Attended', 'Total classes', 'Percentage', 'Classes needed'])
    );
    parts.forEach(({ subject, r }) => {
      r.riskStudents.forEach((s) => {
        const row = s3.addRow([
          subject.department,
          subject.semester,
          subject.name,
          s.rollNo || '',
          s.name,
          s.email,
          s.attended,
          s.totalClasses,
          s.percentage / 100,
          Math.max(1, 3 * s.totalClasses - 4 * s.attended),
        ]);
        row.getCell(9).numFmt = '0.0%';
      });
    });
    [14, 10, 24, 9, 26, 30, 10, 13, 12, 14].forEach((w, i) => (s3.getColumn(i + 1).width = w));
    s3.views = [{ state: 'frozen', ySplit: 1 }];

    const fileName = 'attendance-all-' + dayKey(new Date()) + '.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Excel nahi ban payi' });
    else res.end();
  }
};