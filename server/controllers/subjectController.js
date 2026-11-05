const Subject = require('../models/Subject');
const User = require('../models/User');

// POST /api/subjects  (admin)
exports.createSubject = async (req, res) => {
  try {
    const { name, code, department, semester, teacher } = req.body;

    if (!name || !code || !department || !semester || !teacher) {
      return res
        .status(400)
        .json({ message: 'name, code, department, semester aur teacher zaroori hai' });
    }

    const teacherUser = await User.findById(teacher);
    if (!teacherUser || teacherUser.role !== 'teacher') {
      return res.status(400).json({ message: 'Ye teacher ID sahi nahi hai' });
    }

    const exists = await Subject.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ message: 'Is code ka subject pehle se hai' });
    }

    const subject = await Subject.create({ name, code, department, semester, teacher });
    res.status(201).json({ subject });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/subjects
// admin: sab | teacher: apne subjects | student: apne department + semester ke subjects
exports.getSubjects = async (req, res) => {
  try {
    const { role, _id, department, semester } = req.user;
    let filter = {};

    if (role === 'teacher') filter = { teacher: _id };
    if (role === 'student') filter = { department, semester };

    const subjects = await Subject.find(filter)
      .populate('teacher', 'name email')
      .sort({ semester: 1, name: 1 });

    res.json({ count: subjects.length, subjects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/subjects/:id
exports.getSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('teacher', 'name email');
    if (!subject) return res.status(404).json({ message: 'Subject nahi mila' });
    res.json({ subject });
  } catch (err) {
    res.status(400).json({ message: 'ID sahi nahi hai' });
  }
};

// PUT /api/subjects/:id  (admin)
exports.updateSubject = async (req, res) => {
  try {
    const { name, code, department, semester, teacher } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (code) updates.code = code;
    if (department) updates.department = department;
    if (semester) updates.semester = semester;

    if (teacher) {
      const teacherUser = await User.findById(teacher);
      if (!teacherUser || teacherUser.role !== 'teacher') {
        return res.status(400).json({ message: 'Ye teacher ID sahi nahi hai' });
      }
      updates.teacher = teacher;
    }

    const subject = await Subject.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('teacher', 'name email');

    if (!subject) return res.status(404).json({ message: 'Subject nahi mila' });
    res.json({ subject });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/subjects/:id  (admin)
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject nahi mila' });
    res.json({ message: 'Subject delete ho gaya' });
  } catch (err) {
    res.status(400).json({ message: 'ID sahi nahi hai' });
  }
};