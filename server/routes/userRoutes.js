const express = require('express');
const { getUsers, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', getUsers);
router.delete('/:id', deleteUser);

module.exports = router;