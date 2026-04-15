const express = require('express');
const router = express.Router();
const { getAuditLog, getDriverEarnings } = require('../controllers/auditlog.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.use(authenticate);

router.get('/audit-log', roleGuard('admin'), getAuditLog);
router.get('/earnings/driver', roleGuard('driver'), getDriverEarnings);

module.exports = router;
