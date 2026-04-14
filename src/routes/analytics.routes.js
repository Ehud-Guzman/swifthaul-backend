const express = require('express');
const router = express.Router();
const {
  getOverview, getJobsAnalytics, getRevenueAnalytics,
  getVehicleAnalytics, getDriverAnalytics, getOwnerAnalytics,
  exportJobs, exportEarnings,
} = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.use(authenticate, roleGuard('admin'));

router.get('/overview', getOverview);
router.get('/jobs', getJobsAnalytics);
router.get('/revenue', getRevenueAnalytics);
router.get('/vehicles', getVehicleAnalytics);
router.get('/drivers', getDriverAnalytics);
router.get('/owners', getOwnerAnalytics);
router.get('/export/jobs', exportJobs);
router.get('/export/earnings', exportEarnings);

module.exports = router;
