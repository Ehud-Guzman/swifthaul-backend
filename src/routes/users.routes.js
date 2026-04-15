const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getUsers, createUser, getUserById, updateUser, deleteUser } = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

router.use(authenticate, roleGuard('admin'));

router.get('/', getUsers);

router.post('/', validate([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['owner', 'driver']).withMessage('Role must be owner or driver'),
  body('license_number').if(body('role').equals('driver')).notEmpty().withMessage('License number is required for drivers'),
]), createUser);

router.get('/:id', getUserById);

router.patch('/:id', validate([
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
]), updateUser);

router.delete('/:id', deleteUser);

module.exports = router;
