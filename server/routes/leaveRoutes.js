const express = require('express');
const { createLeave, myLeaves, cancelLeave, listLeaves, decideLeave } = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Student
router.post('/', authorize('student'), createLeave);
router.get('/mine', authorize('student'), myLeaves);
router.delete('/:id', authorize('student'), cancelLeave);

// Teacher (apni classes) ya admin (sab)
router.get('/', authorize('teacher', 'admin'), listLeaves);
router.put('/:id/decision', authorize('teacher', 'admin'), decideLeave);

module.exports = router;