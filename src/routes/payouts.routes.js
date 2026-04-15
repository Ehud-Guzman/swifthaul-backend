const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { createPayout, getPayouts, reviewPayout, getPayoutSummary } = require('../controllers/payouts.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/summary', roleGuard('owner'), getPayoutSummary);

router.get('/', roleGuard('owner', 'admin'), getPayouts);

router.post('/', roleGuard('owner'), validate([
  body('amount_ksh').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('note').optional().isString(),
]), createPayout);

router.patch('/:id', roleGuard('admin'), validate([
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('admin_note').optional().isString(),
]), reviewPayout);

module.exports = router;
