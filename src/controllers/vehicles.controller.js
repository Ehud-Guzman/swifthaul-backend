const Vehicle = require('../models/Vehicle');
const JobRequest = require('../models/JobRequest');

// GET /api/vehicles — supports pagination for admin; owners get all their own vehicles
const getVehicles = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'owner') {
      filter.owner_id = req.user._id;
      // Owners see all their vehicles (no pagination needed — fleet is small)
      const vehicles = await Vehicle.find(filter).populate('owner_id', 'name email').sort({ created_at: -1 });
      return res.json({ vehicles, total: vehicles.length, page: 1, pages: 1 });
    }

    // Admin filters
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.owner_id) filter.owner_id = req.query.owner_id;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter).populate('owner_id', 'name email').sort({ created_at: -1 }).skip(skip).limit(limit),
      Vehicle.countDocuments(filter),
    ]);

    res.json({ vehicles, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/vehicles/available  — for admin assignment dropdown
const getAvailableVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ status: 'available' }).populate('owner_id', 'name email');
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/vehicles — admin adds vehicle and assigns an owner
const createVehicle = async (req, res) => {
  try {
    const { name, type, plate_number, capacity_kg, owner_id } = req.body;
    if (!owner_id) return res.status(400).json({ message: 'owner_id is required' });
    const vehicle = await Vehicle.create({
      owner_id,
      name,
      type,
      plate_number,
      capacity_kg,
    });
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Plate number already registered' });
    res.status(500).json({ message: err.message });
  }
};

// GET /api/vehicles/:id
const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('owner_id', 'name email');
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Owners can only view their own vehicles
    if (req.user.role === 'owner' && vehicle.owner_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/vehicles/:id
const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (req.user.role === 'owner' && vehicle.owner_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowedOwner = ['name', 'plate_number', 'capacity_kg'];
    const allowedAdmin = [...allowedOwner, 'status', 'type'];
    const allowed = req.user.role === 'admin' ? allowedAdmin : allowedOwner;

    allowed.forEach((k) => { if (req.body[k] !== undefined) vehicle[k] = req.body[k]; });
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/vehicles/:id/jobs — job history for a vehicle
const getVehicleJobs = async (req, res) => {
  try {
    const jobs = await JobRequest.find({ vehicle_id: req.params.id })
      .populate('client_id', 'name email')
      .populate('driver_id')
      .sort({ created_at: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getVehicles, getAvailableVehicles, createVehicle, getVehicleById, updateVehicle, getVehicleJobs };
