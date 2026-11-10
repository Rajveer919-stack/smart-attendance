const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Otp = require('../models/Otp');
const bcrypt = require('bcryptjs');
const { issueOtp, checkOtp } = require('../utils/otp');
const { sendOtpMail } = require('../utils/mailer');
const { logEvent } = require('../utils/audit');

// 5 galat password ke baad account 15 minute ke liye band
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const {
  DEPARTMENTS,
  SEMESTERS,
  MAX_ROLL,
  parseRoll,
  parseSemester,
  EMAIL_RE,
} = require('../config/classes');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '365d',
  });

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  rollNo: user.rollNo,
  department: user.department,
  semester: user.semester,
});

const cleanEmail = (v) => String(v || '').trim().toLowerCase();

// Duplicate key error ko samajhne layak message me badalta hai
const friendlyError = (err) => {
  if (err && err.code === 11000) {
    if (err.keyPattern && err.keyPattern.email) return 'Ye email pehle se registered hai';
    return 'Is class me ye roll number pehle se kisi aur student ka hai';
  }
  if (err && err.name === 'ValidationError') {
    return Object.values(err.errors).map((e) => e.message).join(', ');
  }
  return err.message;
};

// GET /api/auth/classes   (public)
// Register page ke dropdown ke liye: saare departments + jin classes ke subject bane hai
exports.getClasses = async (req, res) => {
  try {
    const groups = await Subject.aggregate([
      { $group: { _id: { department: '$department', semester: '$semester' } } },
      { $sort: { '_id.department': 1, '_id.semester': 1 } },
    ]);
    const classes = groups.map((g) => ({
      department: g._id.department,
      semester: g._id.semester,
    }));
    res.json({ departments: DEPARTMENTS, semesters: SEMESTERS, maxRoll: MAX_ROLL, classes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Student ki details check karta hai. Sahi ho to { value }, galat ho to { error }
async function validateStudent(body) {
  const name = String(body.name || '').trim();
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  const department = String(body.department || '').trim();
  const semester = parseSemester(body.semester);
  const rollNo = parseRoll(body.rollNo);

  if (name.length < 2) return { error: 'Naam daalo (kam se kam 2 akshar)' };
  if (!EMAIL_RE.test(email)) return { error: 'Sahi email daalo' };
  if (password.length < 6) return { error: 'Password kam se kam 6 akshar ka ho' };
  if (!DEPARTMENTS.includes(department)) return { error: 'Department list me se chuno' };
  if (!semester) return { error: 'Semester 1 se 8 ke beech chuno' };
  if (!rollNo) return { error: 'Roll number 1 se ' + MAX_ROLL + ' ke beech ka poora number hona chahiye' };

  if (!(await Subject.exists({ department, semester }))) {
    return { error: 'Is class ke abhi koi subject nahi bane hai. Admin se subject banwao' };
  }
  if (await User.exists({ email })) return { error: 'Ye email pehle se registered hai' };
  if (await User.exists({ role: 'student', department, semester, rollNo })) {
    return { error: 'Is class me roll number ' + rollNo + ' pehle se kisi aur student ka hai' };
  }
  return { value: { name, email, password, department, semester, rollNo } };
}

// POST /api/auth/register/request
// Step 1: details check karke email par OTP bhejta hai. Account abhi nahi banta.
exports.registerRequest = async (req, res) => {
  try {
    const v = await validateStudent(req.body);
    if (v.error) return res.status(400).json({ message: v.error });
    const { email, password, ...rest } = v.value;

    const passwordHash = await bcrypt.hash(password, 10);
    const issued = await issueOtp(email, 'register', { ...rest, passwordHash });
    if (issued.tooSoon) {
      return res.status(429).json({ message: '1 minute ruko, fir naya OTP mangao' });
    }

    try {
      await sendOtpMail(email, issued.code, 'register');
    } catch (mailErr) {
      await Otp.deleteOne({ email, purpose: 'register' });
      return res.status(502).json({ message: mailErr.message });
    }
    res.json({ message: 'OTP ' + email + ' par bhej diya gaya hai', email });
  } catch (err) {
    res.status(500).json({ message: friendlyError(err) });
  }
};

// POST /api/auth/register/verify
// Step 2: OTP sahi ho to account ban jata hai aur student login ho jata hai
exports.registerVerify = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const checked = await checkOtp(email, 'register', req.body.otp);
    if (checked.error) return res.status(400).json({ message: checked.error });

    const p = checked.doc.payload;
    const user = new User({
      name: p.name,
      email,
      password: p.passwordHash,
      role: 'student',
      rollNo: p.rollNo,
      department: p.department,
      semester: p.semester,
    });
    user.$locals.skipHash = true;
    await user.save();
    await Otp.deleteOne({ _id: checked.doc._id });

    res.status(201).json({ token: signToken(user._id), user: userResponse(user) });
  } catch (err) {
    res.status(400).json({ message: friendlyError(err) });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'email aur password daalo' });
    }

    const user = await User.findOne({ email }).select('+password');

    // Account lock hai to password check hi nahi karte
    if (user && user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({ message: 'Account abhi band hai. ' + mins + ' minute baad try karo' });
    }

    if (!user || !(await user.matchPassword(password))) {
      if (user) {
        const fails = (user.failedLogins || 0) + 1;
        if (fails >= MAX_FAILS) {
          await User.updateOne(
            { _id: user._id },
            { $set: { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MS) } }
          );
          logEvent(
            'login_locked',
            'Account of ' + user.name + ' (' + user.email + ') was locked for 15 minutes after ' + MAX_FAILS +
              ' wrong passwords',
            { level: 'warn', req, actor: user }
          );
          return res
            .status(423)
            .json({ message: 'Bahut galat password. Account 15 minute ke liye band ho gaya' });
        }
        await User.updateOne({ _id: user._id }, { $set: { failedLogins: fails } });
      }
      return res.status(401).json({ message: 'Email ya password galat hai' });
    }

    // Sahi password: galat try ginti saaf
    if (user.failedLogins || user.lockUntil) {
      await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0 }, $unset: { lockUntil: 1 } });
    }

    res.json({ token: signToken(user._id), user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: userResponse(req.user) });
};

// POST /api/auth/forgot
// Password bhoole to email par OTP bhejta hai. Jawab hamesha ek jaisa deta hai,
// taki koi ye na pata laga sake ki kaun sa email registered hai.
exports.forgotPassword = async (req, res) => {
  const generic = { message: 'Agar ye email registered hai to OTP bhej diya gaya hai' };
  try {
    const email = cleanEmail(req.body.email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Sahi email daalo' });

    const user = await User.findOne({ email }).select('_id');
    if (user) {
      const issued = await issueOtp(email, 'reset');
      if (issued.tooSoon) {
        return res.status(429).json({ message: '1 minute ruko, fir naya OTP mangao' });
      }
      try {
        await sendOtpMail(email, issued.code, 'reset');
      } catch (mailErr) {
        await Otp.deleteOne({ email, purpose: 'reset' });
        return res.status(502).json({ message: mailErr.message });
      }
    }
    res.json(generic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset
// OTP sahi ho to naya password set ho jata hai
exports.resetPassword = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Naya password kam se kam 6 akshar ka ho' });
    }

    const checked = await checkOtp(email, 'reset', req.body.otp);
    if (checked.error) return res.status(400).json({ message: checked.error });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Account nahi mila' });

    user.password = newPassword;
    await user.save();
    await Otp.deleteOne({ _id: checked.doc._id });

    res.json({ message: 'Password badal gaya. Ab naye password se login karo' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/create-user  (sirf admin)
// Teacher ya admin account banane ke liye
exports.createUser = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');
    const role = req.body.role;
    const department = req.body.department ? String(req.body.department).trim() : undefined;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password aur role zaroori hai' });
    }
    if (!['teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Yaha sirf teacher ya admin ban sakta hai' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Sahi email daalo' });
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password kam se kam 6 akshar ka ho' });
    }
    if (await User.exists({ email })) {
      return res.status(400).json({ message: 'Ye email pehle se registered hai' });
    }

    const user = await User.create({ name, email, password, role, department });
    logEvent('user_create', req.user.name + ' created a ' + role + ' account for ' + name + ' (' + email + ')', {
      req,
    });
    res.status(201).json({ user: userResponse(user) });
  } catch (err) {
    res.status(400).json({ message: friendlyError(err) });
  }
};

// PUT /api/auth/account   (login hua koi bhi user)
// Apna email ya password badalna. Abhi ka password dena zaroori hai
exports.updateAccount = async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword) return res.status(400).json({ message: 'Abhi ka password daalo' });
    if (!newEmail && !newPassword) {
      return res.status(400).json({ message: 'Naya email ya naya password daalo' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Abhi ka password galat hai' });
    }

    if (newEmail && cleanEmail(newEmail) !== user.email) {
      const email = cleanEmail(newEmail);
      if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Sahi email daalo' });
      if (await User.exists({ email })) {
        return res.status(400).json({ message: 'Ye email pehle se kisi aur ka hai' });
      }
      user.email = email;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Naya password kam se kam 6 akshar ka ho' });
      }
      user.password = newPassword;
    }

    await user.save();
    logEvent('account_update', user.name + ' changed their own ' + (newPassword ? 'password' : 'email'), {
      req,
    });
    res.json({ message: 'Account update ho gaya', user: userResponse(user) });
  } catch (err) {
    res.status(400).json({ message: friendlyError(err) });
  }
};

exports.friendlyError = friendlyError;