const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subject = require('../models/Subject');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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

// GET /api/auth/classes   (public)
// Un classes ki list jinke subject bane hue hai. Register page ka dropdown isi se banta hai
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
    res.json({ classes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/register
// Public register sirf student ke liye. Teacher/admin admin hi banayega.
exports.register = async (req, res) => {
  try {
    const { name, email, password, rollNo, department, semester } = req.body;

    if (!name || !email || !password || !rollNo || !department || !semester) {
      return res
        .status(400)
        .json({ message: 'name, email, password, roll number aur class sab zaroori hai' });
    }

    // Student us class me hi register ho sakta hai jiske subject bane hue hai
    const classExists = await Subject.exists({
      department,
      semester: Number(semester),
    });
    if (!classExists) {
      return res.status(400).json({
        message: 'Is class ke abhi koi subject nahi bane hai. Admin se subject banwao',
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Ye email pehle se registered hai' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      rollNo,
      department,
      semester: Number(semester),
    });

    res.status(201).json({ token: signToken(user._id), user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email aur password daalo' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Email ya password galat hai' });
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

// POST /api/auth/create-user  (sirf admin)
// Teacher ya admin account banane ke liye
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, rollNo, department, semester } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password aur role zaroori hai' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Ye email pehle se registered hai' });
    }

    const user = await User.create({ name, email, password, role, rollNo, department, semester });
    res.status(201).json({ user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};