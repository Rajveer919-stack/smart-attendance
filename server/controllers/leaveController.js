const LeaveRequest = require('../models/LeaveRequest');
const Subject = require('../models/Subject');
const { notifyUsers } = require('../utils/push');
const { logEvent } = require('../utils/audit');

const IST_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 30; // ek request me zyada se zyada din
const MAX_PENDING = 3; // ek sath itni pending request
const BACK_DAYS = 7; // itne din purani date tak chalega
const AHEAD_DAYS = 60; // itne din aage tak

const todayKey = () => new Date(Date.now() + IST_MS).toISOString().slice(0, 10);

// 'YYYY-MM-DD' sachi date hai to din ginti (UTC midnight ms), warna null
function dayNumber(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return d.getTime();
}

// Input jaanch. Sahi ho to { ok: true, from, to, reason, days }, warna { ok: false, message }
function validateLeaveInput(body, today) {
  const b = body || {};
  const from = dayNumber(b.fromDate);
  const to = dayNumber(b.toDate);
  const now = dayNumber(today);
  if (from === null || to === null) return { ok: false, message: 'Dates sahi nahi hain' };
  if (to < from) return { ok: false, message: 'Aakhri date shuru ki date se pehle nahi ho sakti' };
  const days = Math.round((to - from) / DAY_MS) + 1;
  if (days > MAX_DAYS) return { ok: false, message: 'Ek request me ' + MAX_DAYS + ' din se zyada nahi' };
  if (from < now - BACK_DAYS * DAY_MS) return { ok: false, message: BACK_DAYS + ' din se purani date ki leave nahi maangi ja sakti' };
  if (to > now + AHEAD_DAYS * DAY_MS) return { ok: false, message: 'Itni aage ki leave abhi nahi maangi ja sakti' };
  const reason = String(b.reason || '').trim().replace(/\s+/g, ' ');
  if (reason.length < 5) return { ok: false, message: 'Wajah thodi detail me likho (kam se kam 5 akshar)' };
  if (reason.length > 300) return { ok: false, message: 'Wajah 300 akshar se choti rakho' };
  return { ok: true, from: b.fromDate, to: b.toDate, reason, days };
}

const shape = (l) => ({
  id: l._id,
  fromDate: l.fromDate,
  toDate: l.toDate,
  days: Math.round((dayNumber(l.toDate) - dayNumber(l.fromDate)) / DAY_MS) + 1,
  reason: l.reason,
  status: l.status,
  note: l.note || '',
  decidedAt: l.decidedAt || null,
  createdAt: l.createdAt,
  department: l.department,
  semester: l.semester,
  student: l.student && l.student.name ? { id: l.student._id, name: l.student.name, rollNo: l.student.rollNo } : undefined,
});

// Is teacher ki classes ("dept|sem") ki list
async function teacherClasses(teacherId) {
  const subs = await Subject.find({ teacher: teacherId }).select('department semester').lean();
  const set = new Map();
  subs.forEach((s) => set.set(s.department + '|' + s.semester, { department: s.department, semester: s.semester }));
  return set;
}

// POST /api/leaves   (student)
exports.createLeave = async (req, res) => {
  try {
    const v = validateLeaveInput(req.body, todayKey());
    if (!v.ok) return res.status(400).json({ message: v.message });
    const u = req.user;
    if (!u.department || !u.semester) return res.status(400).json({ message: 'Tumhari class set nahi hai' });

    const open = await LeaveRequest.find({ student: u._id, status: { $in: ['pending', 'approved'] }, toDate: { $gte: todayKey() } })
      .select('fromDate toDate status')
      .lean();
    if (open.filter((x) => x.status === 'pending').length >= MAX_PENDING) {
      return res.status(400).json({ message: 'Ek sath ' + MAX_PENDING + ' se zyada pending request nahi. Pehle purani ka jawab aane do' });
    }
    if (open.some((x) => v.from <= x.toDate && v.to >= x.fromDate)) {
      return res.status(400).json({ message: 'In dates ki request pehle se maujood hai' });
    }

    const leave = await LeaveRequest.create({
      student: u._id,
      department: u.department,
      semester: u.semester,
      fromDate: v.from,
      toDate: v.to,
      reason: v.reason,
    });

    // Class ke teachers ko khabar (na jaye to koi baat nahi)
    Subject.distinct('teacher', { department: u.department, semester: u.semester })
      .then((ids) =>
        ids.length
          ? notifyUsers(ids, {
              title: 'Nayi leave request: ' + u.name,
              body: v.from + (v.to !== v.from ? ' se ' + v.to : '') + '. Dekhne ke liye kholo.',
              url: '/teacher',
              tag: 'leave-' + leave._id,
            })
          : null
      )
      .catch(() => {});

    res.status(201).json({ message: 'Leave request bhej di gayi', leave: shape(leave) });
  } catch (err) {
    res.status(500).json({ message: 'Request nahi ja payi. Thodi der baad try karo' });
  }
};

// GET /api/leaves/mine   (student)
exports.myLeaves = async (req, res) => {
  try {
    const list = await LeaveRequest.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    res.json({ leaves: list.map(shape) });
  } catch (err) {
    res.status(500).json({ message: 'Leave list nahi mili' });
  }
};

// DELETE /api/leaves/:id   (student, sirf pending wali)
exports.cancelLeave = async (req, res) => {
  try {
    const r = await LeaveRequest.findOneAndDelete({ _id: req.params.id, student: req.user._id, status: 'pending' });
    if (!r) return res.status(404).json({ message: 'Ye request ab hata nahi sakte' });
    res.json({ message: 'Request hata di gayi' });
  } catch (err) {
    res.status(400).json({ message: 'Request ID sahi nahi hai' });
  }
};

// GET /api/leaves?status=pending|all   (teacher: apni classes, admin: sab)
exports.listLeaves = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status === 'pending') filter.status = 'pending';
    else filter.status = { $in: ['pending', 'approved', 'rejected'] };

    if (req.user.role === 'teacher') {
      const classes = Array.from((await teacherClasses(req.user._id)).values());
      if (classes.length === 0) return res.json({ leaves: [], pending: 0 });
      filter.$or = classes.map((c) => ({ department: c.department, semester: c.semester }));
    }

    const list = await LeaveRequest.find(filter)
      .sort(req.query.status === 'pending' ? { createdAt: 1 } : { createdAt: -1 })
      .limit(100)
      .populate('student', 'name rollNo')
      .lean();
    const pendingFilter = { ...filter, status: 'pending' };
    const pending = await LeaveRequest.countDocuments(pendingFilter);
    res.json({ leaves: list.map(shape), pending });
  } catch (err) {
    res.status(500).json({ message: 'Leave requests nahi mili' });
  }
};

// PUT /api/leaves/:id/decision   body: { status: 'approved'|'rejected', note? }
exports.decideLeave = async (req, res) => {
  try {
    const status = req.body && req.body.status;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'Faisla approved ya rejected hona chahiye' });
    }
    const note = String((req.body && req.body.note) || '').trim().slice(0, 200);

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Request nahi mili' });

    if (req.user.role === 'teacher') {
      const classes = await teacherClasses(req.user._id);
      if (!classes.has(leave.department + '|' + leave.semester)) {
        return res.status(403).json({ message: 'Ye student tumhari class ka nahi hai' });
      }
    }

    // Sirf pending wali badlegi (do teacher ek sath karein to ek hi chalega)
    const done = await LeaveRequest.findOneAndUpdate(
      { _id: leave._id, status: 'pending' },
      { status, note, decidedBy: req.user._id, decidedAt: new Date() },
      { new: true }
    );
    if (!done) return res.status(409).json({ message: 'Is request par pehle hi faisla ho chuka hai' });

    notifyUsers([done.student], {
      title: status === 'approved' ? 'Leave approve ho gayi' : 'Leave reject ho gayi',
      body: done.fromDate + (done.toDate !== done.fromDate ? ' se ' + done.toDate : '') + (note ? ': ' + note : ''),
      url: '/student',
      tag: 'leave-' + done._id,
    }).catch(() => {});

    logEvent('leave_decision', req.user.name + ' ' + status + ' a leave request (' + done.fromDate + ' to ' + done.toDate + ')', {
      req,
      meta: { leave: String(done._id), status },
    });

    res.json({ message: status === 'approved' ? 'Leave approve ho gayi' : 'Leave reject ho gayi', leave: shape(done) });
  } catch (err) {
    res.status(400).json({ message: 'Request ID sahi nahi hai' });
  }
};

exports.validateLeaveInput = validateLeaveInput;