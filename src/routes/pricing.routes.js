const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getPricing, upsertPricing, getEstimate } = require('../controllers/pricing.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const VEHICLE_TYPES = ['mini_van', 'truck_3t', 'flatbed', 'semi_trailer'];

router.get('/', authenticate, getPricing);

router.put('/:vehicle_type', authenticate, roleGuard('admin'), validate([
  body('base_rate_ksh').isFloat({ min: 0 }).withMessage('Base rate must be a non-negative number'),
  body('rate_per_kg').isFloat({ min: 0 }).withMessage('Rate per kg must be a non-negative number'),
]), upsertPricing);

router.post('/estimate', authenticate, validate([
  body('vehicle_type').isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
  body('weight_kg').isFloat({ min: 0.1 }).withMessage('Weight must be a positive number'),
]), getEstimate);

module.exports = router;
