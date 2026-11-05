const User = require('../models/User');

// GET /api/users?role=teacher&department=BCA&semester=6   (admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, department, semester } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);

    const users = await User.find(filter).sort({ role: 1, name: 1 });
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id   (admin)
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) {
      return res.status(400).json({ message: 'Apna khud ka account delete nahi kar sakte' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    res.json({ message: 'User delete ho gaya' });
  } catch (err) {
    res.status(400).json({ message: 'ID sahi nahi hai' });
  }
};