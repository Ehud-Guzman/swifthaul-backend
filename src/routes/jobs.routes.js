const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getJobs, createJob, getJobById,
  assignJob, reassignJob, updateStatus, cancelJob, getJobLogs,
} = require('../controllers/jobs.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const CARGO_TYPES = ['general', 'heavy_equipment', 'fragile', 'perishable', 'other'];
const JOB_STATUSES = ['picked_up', 'in_transit', 'delivered'];

router.use(authenticate);

router.get('/', roleGuard('admin', 'client', 'driver', 'owner'), getJobs);

router.post('/', roleGuard('client'), validate([
  body('cargo_type').isIn(CARGO_TYPES).withMessage('Invalid cargo type'),
  body('weight_kg').isFloat({ min: 0.1 }).withMessage('Weight must be a positive number'),
  body('pickup_location').trim().notEmpty().withMessage('Pickup location is required'),
  body('dropoff_location').trim().notEmpty().withMessage('Drop-off location is required'),
  body('preferred_date').isISO8601().withMessage('Valid preferred date is required'),
]), createJob);

router.get('/:id', roleGuard('admin', 'client', 'driver', 'owner'), getJobById);

router.patch('/:id/assign', roleGuard('admin'), validate([
  body('vehicle_id').notEmpty().withMessage('Vehicle is required'),
  body('driver_id').notEmpty().withMessage('Driver is required'),
  body('price_override').optional().isFloat({ min: 0 }).withMessage('Price override must be a positive number'),
]), assignJob);

router.patch('/:id/reassign', roleGuard('admin'), validate([
  body('vehicle_id').notEmpty().withMessage('Vehicle is required'),
  body('driver_id').notEmpty().withMessage('Driver is required'),
  body('price_override').optional().isFloat({ min: 0 }).withMessage('Price override must be a positive number'),
]), reassignJob);

router.patch('/:id/status', roleGuard('driver'), validate([
  body('new_status').isIn(JOB_STATUSES).withMessage('Invalid status'),
]), updateStatus);

router.patch('/:id/cancel', roleGuard('admin', 'client'), cancelJob);

router.get('/:id/logs', roleGuard('admin', 'client', 'driver'), getJobLogs);

module.exports = router;
