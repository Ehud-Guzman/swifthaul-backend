const express = require('express');
const router = express.Router();
const {
  getVehicles, getAvailableVehicles, createVehicle,
  getVehicleById, updateVehicle, getVehicleJobs,
} = require('../controllers/vehicles.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.use(authenticate);

// Available vehicles for admin assignment — must come before /:id
router.get('/available', roleGuard('admin'), getAvailableVehicles);

router.get('/', roleGuard('admin', 'owner'), getVehicles);
router.post('/', roleGuard('admin'), createVehicle);
router.get('/:id', roleGuard('admin', 'owner'), getVehicleById);
router.patch('/:id', roleGuard('admin', 'owner'), updateVehicle);
router.get('/:id/jobs', roleGuard('admin', 'owner'), getVehicleJobs);

module.exports = router;
