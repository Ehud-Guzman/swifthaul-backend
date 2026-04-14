const JobRequest = require('../models/JobRequest');
const JobStatusLog = require('../models/JobStatusLog');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const PricingRule = require('../models/PricingRule');
const EarningsLog = require('../models/EarningsLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  sendEmail, jobAssignedEmail, jobPickedUpEmail,
  jobDeliveredEmail, newJobRequestEmail,
} = require('../services/email.service');

// Helper — create notification + optionally send email
const notify = async ({ user_id, title, message, email, emailTemplate }) => {
  await Notification.create({ user_id, title, message });
  if (email && emailTemplate) {
    await sendEmail({ to: email, ...emailTemplate });
  }
};

// GET /api/jobs
const getJobs = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'client') {
      filter.client_id = req.user._id;
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ user_id: req.user._id });
      if (!driver) return res.json([]);
      filter.driver_id = driver._id;
      filter.status = { $in: ['assigned', 'picked_up', 'in_transit', 'delivered'] };
    }
    // Admin sees all; apply optional query filters
    if (req.user.role === 'admin') {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.driver_id) filter.driver_id = req.query.driver_id;
      if (req.query.vehicle_id) filter.vehicle_id = req.query.vehicle_id;
      if (req.query.date_from || req.query.date_to) {
        filter.preferred_date = {};
        if (req.query.date_from) filter.preferred_date.$gte = new Date(req.query.date_from);
        if (req.query.date_to) filter.preferred_date.$lte = new Date(req.query.date_to);
      }
    }

    const jobs = await JobRequest.find(filter)
      .populate('client_id', 'name email phone')
      .populate('vehicle_id', 'name type plate_number')
      .populate('driver_id')
      .populate('assigned_by', 'name')
      .sort({ created_at: -1 });

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/jobs — client submits job request
const createJob = async (req, res) => {
  try {
    const { cargo_type, weight_kg, pickup_location, dropoff_location, preferred_date, notes, vehicle_type } = req.body;

    // Calculate suggested price
    let suggested_price = 0;
    if (vehicle_type) {
      const rule = await PricingRule.findOne({ vehicle_type });
      if (rule) {
        suggested_price = rule.base_rate_ksh + weight_kg * rule.rate_per_kg;
      }
    }

    const job = await JobRequest.create({
      client_id: req.user._id,
      cargo_type,
      weight_kg,
      pickup_location,
      dropoff_location,
      preferred_date,
      notes,
      suggested_price,
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin', is_active: true });
    for (const admin of admins) {
      await notify({
        user_id: admin._id,
        title: 'New Job Request',
        message: `New job from ${req.user.name}: ${pickup_location} → ${dropoff_location}`,
        email: admin.email,
        emailTemplate: newJobRequestEmail(admin.name, job),
      });
    }

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const job = await JobRequest.findById(req.params.id)
      .populate('client_id', 'name email phone')
      .populate('vehicle_id', 'name type plate_number capacity_kg')
      .populate({ path: 'driver_id', populate: { path: 'user_id', select: 'name phone email' } })
      .populate('assigned_by', 'name');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Access check
    if (req.user.role === 'client' && job.client_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ user_id: req.user._id });
      if (!driver || job.driver_id?._id?.toString() !== driver._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/jobs/:id/assign — admin assigns vehicle + driver
const assignJob = async (req, res) => {
  try {
    const { vehicle_id, driver_id, price_override } = req.body;
    const job = await JobRequest.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.status !== 'pending') return res.status(400).json({ message: 'Only pending jobs can be assigned' });

    // Check vehicle is available (no active job)
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle || vehicle.status === 'assigned') {
      return res.status(400).json({ message: 'Vehicle is not available' });
    }

    // Check driver is available (no active job)
    const driver = await Driver.findById(driver_id);
    if (!driver || !driver.is_available) {
      return res.status(400).json({ message: 'Driver is not available' });
    }

    const oldStatus = job.status;

    job.vehicle_id = vehicle_id;
    job.driver_id = driver_id;
    job.assigned_by = req.user._id;
    job.assigned_at = new Date();
    job.status = 'assigned';
    if (price_override !== undefined) job.suggested_price = price_override;
    await job.save();

    // Update vehicle and driver availability
    vehicle.status = 'assigned';
    await vehicle.save();
    driver.is_available = false;
    await driver.save();

    // Log status change
    await JobStatusLog.create({
      job_id: job._id, changed_by: req.user._id,
      old_status: oldStatus, new_status: 'assigned',
      note: `Assigned by admin. Vehicle: ${vehicle.plate_number}`,
    });

    // Notify client (or guest email), driver, owner
    const driverUser = await User.findById(driver.user_id);
    const owner = await User.findById(vehicle.owner_id);

    if (job.is_guest && job.guest_email) {
      // Guest — send email only, no in-app notification
      await sendEmail({ to: job.guest_email, ...jobAssignedEmail(job.guest_name || 'Customer', job) });
    } else if (job.client_id) {
      const client = await User.findById(job.client_id);
      if (client) {
        await notify({ user_id: client._id, title: 'Job Assigned', message: 'Your job has been assigned. A driver is on the way.', email: client.email, emailTemplate: jobAssignedEmail(client.name, job) });
      }
    }

    await notify({ user_id: driverUser._id, title: 'New Job Assigned', message: `You have a new job: ${job.pickup_location} → ${job.dropoff_location}`, email: driverUser.email, emailTemplate: jobAssignedEmail(driverUser.name, job) });
    if (owner) {
      await notify({ user_id: owner._id, title: 'Vehicle Assigned to Job', message: `Your vehicle ${vehicle.name} has been assigned to a job.`, email: owner.email, emailTemplate: jobAssignedEmail(owner.name, job) });
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/jobs/:id/status — driver updates job status
const updateStatus = async (req, res) => {
  try {
    const { new_status, note } = req.body;
    const allowedTransitions = {
      assigned: ['picked_up'],
      picked_up: ['in_transit'],
      in_transit: ['delivered'],
    };

    const job = await JobRequest.findById(req.params.id).populate('vehicle_id').populate('driver_id');
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Verify this driver owns the job
    const driver = await Driver.findOne({ user_id: req.user._id });
    if (!driver || job.driver_id._id.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: 'This job is not assigned to you' });
    }

    const allowed = allowedTransitions[job.status];
    if (!allowed || !allowed.includes(new_status)) {
      return res.status(400).json({ message: `Cannot transition from ${job.status} to ${new_status}` });
    }

    // Enforce sequential multi-drop: only one active job at a time
    if (new_status === 'picked_up') {
      const activeJob = await JobRequest.findOne({
        driver_id: driver._id,
        status: { $in: ['picked_up', 'in_transit'] },
        _id: { $ne: job._id },
      });
      if (activeJob) {
        return res.status(400).json({ message: 'Complete your current active job before starting another' });
      }
    }

    const oldStatus = job.status;
    job.status = new_status;
    await job.save();

    await JobStatusLog.create({
      job_id: job._id, changed_by: req.user._id,
      old_status: oldStatus, new_status, note,
    });

    // Helper: notify client (guest email or registered user)
    const notifyClient = async (title, message, emailTemplate) => {
      if (job.is_guest && job.guest_email) {
        await sendEmail({ to: job.guest_email, ...emailTemplate(job.guest_name || 'Customer', job) });
      } else if (job.client_id) {
        const client = await User.findById(job.client_id);
        if (client) await notify({ user_id: client._id, title, message, email: client.email, emailTemplate: emailTemplate(client.name, job) });
      }
    };

    if (new_status === 'picked_up') {
      await notifyClient('Cargo Picked Up', 'Your cargo has been picked up and is on its way.', jobPickedUpEmail);
    }

    if (new_status === 'delivered') {
      const vehicle = await Vehicle.findById(job.vehicle_id);
      vehicle.status = 'available';
      await vehicle.save();

      driver.is_available = true;
      await driver.save();

      // Log earnings for the vehicle owner
      await EarningsLog.create({
        job_id: job._id,
        vehicle_id: vehicle._id,
        owner_id: vehicle.owner_id,
        amount_ksh: job.suggested_price,
      });

      // Notify client, admin(s), owner
      const admins = await User.find({ role: 'admin', is_active: true });
      const owner = await User.findById(vehicle.owner_id);

      await notifyClient('Job Delivered', 'Your cargo has been delivered successfully!', jobDeliveredEmail);
      for (const admin of admins) {
        await notify({ user_id: admin._id, title: 'Job Delivered', message: `Job #${job._id} delivered.`, email: admin.email, emailTemplate: jobDeliveredEmail(admin.name, job) });
      }
      if (owner) {
        await notify({ user_id: owner._id, title: 'Job Delivered — Earnings Logged', message: `Vehicle ${vehicle.name} completed a job. Earnings: KSH ${job.suggested_price}`, email: owner.email, emailTemplate: jobDeliveredEmail(owner.name, job) });
      }
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/jobs/:id/cancel — client (pending only) or admin
const cancelJob = async (req, res) => {
  try {
    const job = await JobRequest.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role === 'client') {
      if (job.client_id.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Access denied' });
      if (job.status !== 'pending') return res.status(400).json({ message: 'Can only cancel pending jobs' });
    }

    if (['delivered', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ message: 'Cannot cancel a delivered or already cancelled job' });
    }

    const oldStatus = job.status;

    // Release vehicle and driver if already assigned
    if (job.vehicle_id) {
      await Vehicle.findByIdAndUpdate(job.vehicle_id, { status: 'available' });
    }
    if (job.driver_id) {
      await Driver.findByIdAndUpdate(job.driver_id, { is_available: true });
    }

    job.status = 'cancelled';
    await job.save();

    await JobStatusLog.create({
      job_id: job._id, changed_by: req.user._id,
      old_status: oldStatus, new_status: 'cancelled',
      note: req.body.note || 'Cancelled',
    });

    res.json({ message: 'Job cancelled', job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:id/logs — status history
const getJobLogs = async (req, res) => {
  try {
    const logs = await JobStatusLog.find({ job_id: req.params.id })
      .populate('changed_by', 'name role')
      .sort({ timestamp: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getJobs, createJob, getJobById, assignJob, updateStatus, cancelJob, getJobLogs };
