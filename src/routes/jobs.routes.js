const express = require('express');
const router = express.Router();
const {
  getJobs, createJob, getJobById,
  assignJob, updateStatus, cancelJob, getJobLogs,
} = require('../controllers/jobs.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.use(authenticate);

router.get('/', roleGuard('admin', 'client', 'driver'), getJobs);
router.post('/', roleGuard('client'), createJob);
router.get('/:id', roleGuard('admin', 'client', 'driver'), getJobById);
router.patch('/:id/assign', roleGuard('admin'), assignJob);
router.patch('/:id/status', roleGuard('driver'), updateStatus);
router.patch('/:id/cancel', roleGuard('admin', 'client'), cancelJob);
router.get('/:id/logs', roleGuard('admin', 'client', 'driver'), getJobLogs);

module.exports = router;
