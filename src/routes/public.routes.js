const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const { publicEstimate, submitGuestQuote, trackJob } = require('../controllers/public.controller');
const { validate } = require('../middleware/validate');

const CARGO_TYPES = ['general', 'heavy_equipment', 'fragile', 'perishable', 'other'];
const VEHICLE_TYPES = ['mini_van', 'truck_3t', 'flatbed', 'semi_trailer'];

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicLimiter);

router.post('/estimate', validate([
  body('vehicle_type').isIn(VEHICLE_TYPES).withMessage('Invalid vehicle type'),
  body('weight_kg').isFloat({ min: 0.1 }).withMessage('Weight must be a positive number'),
]), publicEstimate);

router.post('/quote', validate([
  body('guest_name').trim().notEmpty().withMessage('Name is required'),
  body('guest_email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('guest_phone').trim().notEmpty().withMessage('Phone number is required'),
  body('cargo_type').isIn(CARGO_TYPES).withMessage('Invalid cargo type'),
  body('weight_kg').isFloat({ min: 0.1 }).withMessage('Weight must be a positive number'),
  body('pickup_location').trim().notEmpty().withMessage('Pickup location is required'),
  body('dropoff_location').trim().notEmpty().withMessage('Drop-off location is required'),
  body('preferred_date').isISO8601().withMessage('Valid preferred date is required'),
]), submitGuestQuote);

router.get('/track/:id', validate([
  param('id').isMongoId().withMessage('Invalid tracking ID format.'),
]), trackJob);

module.exports = router;
