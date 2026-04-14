const express = require('express');
const router = express.Router();
const { getPricing, upsertPricing, getEstimate } = require('../controllers/pricing.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.get('/', authenticate, getPricing);
router.put('/:vehicle_type', authenticate, roleGuard('admin'), upsertPricing);
router.post('/estimate', authenticate, getEstimate);

module.exports = router;
