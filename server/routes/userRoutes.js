const express = require('express');
const {
  getUsers,
  getClassSummary,
  getMyClasses,
  getClassStudents,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Ye dono teacher aur admin dono ke liye hai
router.get('/my-classes', authorize('teacher', 'admin'), getMyClasses);
router.get('/class-students', authorize('teacher', 'admin'), getClassStudents);

// Baaki sirf admin ke liye
router.get('/summary', authorize('admin'), getClassSummary);
router.get('/', authorize('admin'), getUsers);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;