const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getVehicles, getAvailableVehicles, createVehicle,
  getVehicleById, updateVehicle, getVehicleJobs,
} = require('../controllers/vehicles.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const VEHICLE_TYPES = ['mini_van', 'truck_3t', 'flatbed', 'semi_trailer'];

router.use(authenticate);

// Available vehicles for admin assignment — must come before /:id
router.get('/available', roleGuard('admin'), getAvailableVehicles);

router.get('/', roleGuard('admin', 'owner'), getVehicles);

router.post('/', roleGuard('admin'), validate([
  body('owner_id').notEmpty().withMessage('Owner is required'),
  body('name').trim().notEmpty().withMessage('Vehicle name is required'),
  body('type').isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
  body('plate_number').trim().notEmpty().withMessage('Plate number is required'),
  body('capacity_kg').isFloat({ min: 1 }).withMessage('Capacity must be a positive number'),
]), createVehicle);

router.get('/:id', roleGuard('admin', 'owner'), getVehicleById);

router.patch('/:id', roleGuard('admin', 'owner'), validate([
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('plate_number').optional().trim().notEmpty().withMessage('Plate number cannot be empty'),
  body('capacity_kg').optional().isFloat({ min: 1 }).withMessage('Capacity must be a positive number'),
  body('status').optional().isIn(['available', 'assigned', 'maintenance']).withMessage('Invalid status'),
  body('type').optional().isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
]), updateVehicle);

router.get('/:id/jobs', roleGuard('admin', 'owner'), getVehicleJobs);

module.exports = router;
