const User = require('../models/User');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const { friendlyError } = require('./authController');
const {
  DEPARTMENTS,
  MAX_ROLL,
  parseRoll,
  parseSemester,
  EMAIL_RE,
} = require('../config/classes');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users?role=student&department=BCA&semester=6&q=rahul&page=1&limit=500   (sirf admin)
// Hamesha department -> semester -> roll number (1,2,3...) ke order me aata hai
exports.getUsers = async (req, res) => {
  try {
    const { role, department, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    const sem = parseSemester(req.query.semester);
    if (sem) filter.semester = sem;

    if (q && String(q).trim()) {
      const text = escapeRegex(String(q).trim());
      const or = [{ name: new RegExp(text, 'i') }, { email: new RegExp(text, 'i') }];
      if (/^\d+$/.test(String(q).trim())) or.push({ rollNo: Number(q) });
      filter.$or = or;
    }

    const limit = Math.min(Number(req.query.limit) || 500, 1000);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ department: 1, semester: 1, rollNo: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/summary   (sirf admin)
// Har department aur semester me kitne students hai
exports.getClassSummary = async (req, res) => {
  try {
    const rows = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: { department: '$department', semester: '$semester' }, count: { $sum: 1 } } },
      { $sort: { '_id.department': 1, '_id.semester': 1 } },
    ]);
    res.json({
      classes: rows.map((r) => ({
        department: r._id.department,
        semester: r._id.semester,
        count: r.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/my-classes   (teacher / admin)
// Teacher ko wahi classes dikhti hai jinke subject uske naam par hai
exports.getMyClasses = async (req, res) => {
  try {
    const match = req.user.role === 'teacher' ? { teacher: req.user._id } : {};
    const groups = await Subject.aggregate([
      { $match: match },
      { $group: { _id: { department: '$department', semester: '$semester' } } },
    ]);

    const counts = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: { department: '$department', semester: '$semester' }, count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.department + '|' + c._id.semester, c.count]));

    const classes = groups
      .map((g) => ({
        department: g._id.department,
        semester: g._id.semester,
        count: countMap.get(g._id.department + '|' + g._id.semester) || 0,
      }))
      .sort((a, b) => a.department.localeCompare(b.department) || a.semester - b.semester);

    res.json({ classes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/class-students?department=BCA&semester=6   (teacher / admin)
// Ek class ke saare students, roll number 1,2,3... ke order me
exports.getClassStudents = async (req, res) => {
  try {
    const department = String(req.query.department || '').trim();
    const semester = parseSemester(req.query.semester);
    if (!department || !semester) {
      return res.status(400).json({ message: 'department aur semester chuno' });
    }

    if (req.user.role === 'teacher') {
      const mine = await Subject.exists({ teacher: req.user._id, department, semester });
      if (!mine) return res.status(403).json({ message: 'Ye class tumhari nahi hai' });
    }

    const students = await User.find({ role: 'student', department, semester })
      .select('name email rollNo department semester')
      .sort({ rollNo: 1, name: 1 })
      .lean();
    res.json({ department, semester, total: students.length, students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:id   (sirf admin)
// Kisi bhi user ka naam, email, roll number, department, semester ya password badalna
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User nahi mila' });

    const { name, email, rollNo, department, semester, newPassword } = req.body;

    if (name !== undefined) {
      const n = String(name).trim();
      if (n.length < 2) return res.status(400).json({ message: 'Naam kam se kam 2 akshar ka ho' });
      user.name = n;
    }

    if (email !== undefined) {
      const e = String(email).trim().toLowerCase();
      if (!EMAIL_RE.test(e)) return res.status(400).json({ message: 'Sahi email daalo' });
      if (e !== user.email) {
        if (await User.exists({ email: e, _id: { $ne: user._id } })) {
          return res.status(400).json({ message: 'Ye email pehle se kisi aur ka hai' });
        }
        user.email = e;
      }
    }

    if (user.role === 'student') {
      if (rollNo !== undefined) {
        const r = parseRoll(rollNo);
        if (!r) {
          return res
            .status(400)
            .json({ message: 'Roll number 1 se ' + MAX_ROLL + ' ke beech ka poora number ho' });
        }
        user.rollNo = r;
      }
      if (department !== undefined) {
        if (!DEPARTMENTS.includes(department)) {
          return res.status(400).json({ message: 'Department list me se chuno' });
        }
        user.department = department;
      }
      if (semester !== undefined) {
        const s = parseSemester(semester);
        if (!s) return res.status(400).json({ message: 'Semester 1 se 8 ke beech ho' });
        user.semester = s;
      }
    } else if (department !== undefined) {
      user.department = String(department).trim();
    }

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'Naya password kam se kam 6 akshar ka ho' });
      }
      user.password = String(newPassword);
    }

    await user.save();
    const out = user.toObject();
    delete out.password;
    res.json({ message: 'Update ho gaya', user: out });
  } catch (err) {
    res.status(400).json({ message: friendlyError(err) });
  }
};

// DELETE /api/users/:id   (sirf admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'Apna khud ka account delete nahi kar sakte' });
    }
    if (user.role === 'teacher' && (await Subject.exists({ teacher: user._id }))) {
      return res.status(400).json({
        message: 'Is teacher ke subject bane hai. Pehle wo subject delete karo ya kisi aur ko do',
      });
    }
    if (user.role === 'student') {
      await Attendance.deleteMany({ student: user._id });
    }
    await user.deleteOne();
    res.json({ message: 'Delete ho gaya' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};