const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { createDispute, getDisputes, resolveDispute } = require('../controllers/disputes.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');

const DISPUTE_TYPES = ['damage', 'delay', 'missing_item', 'wrong_delivery', 'overcharge', 'other'];

router.use(authenticate);

router.get('/', roleGuard('client', 'admin'), getDisputes);

router.post('/', roleGuard('client'), validate([
  body('job_id').notEmpty().withMessage('Job ID is required'),
  body('type').isIn(DISPUTE_TYPES).withMessage('Invalid dispute type'),
  body('description').trim().notEmpty().withMessage('Description is required'),
]), createDispute);

router.patch('/:id', roleGuard('admin'), validate([
  body('status').isIn(['in_review', 'resolved', 'closed']).withMessage('Invalid status'),
  body('resolution').optional().isString(),
]), resolveDispute);

module.exports = router;
