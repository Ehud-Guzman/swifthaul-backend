const Dispute = require('../models/Dispute');
const JobRequest = require('../models/JobRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

// POST /api/disputes — client files a dispute on a delivered or cancelled job
const createDispute = async (req, res) => {
  try {
    const { job_id, type, description } = req.body;

    const job = await JobRequest.findById(job_id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only the job owner can file a dispute
    if (job.client_id && job.client_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow disputes on delivered or cancelled jobs
    if (!['delivered', 'cancelled', 'in_transit', 'picked_up'].includes(job.status)) {
      return res.status(400).json({ message: 'Disputes can only be filed after pickup' });
    }

    // Prevent duplicate open disputes for the same job
    const existing = await Dispute.findOne({ job_id, status: { $in: ['open', 'in_review'] } });
    if (existing) {
      return res.status(400).json({ message: 'An open dispute already exists for this job' });
    }

    const dispute = await Dispute.create({
      job_id,
      client_id: req.user._id,
      type,
      description,
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin', is_active: true });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin._id,
        title: 'New Dispute Filed',
        message: `${req.user.name} filed a dispute (${type}) on job #${job_id.toString().slice(-6)}.`,
      });
    }

    res.status(201).json(dispute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/disputes — client sees own; admin sees all
const getDisputes = async (req, res) => {
  try {
    const filter = req.user.role === 'client' ? { client_id: req.user._id } : {};
    if (req.user.role === 'admin' && req.query.status) filter.status = req.query.status;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('job_id', 'pickup_location dropoff_location status')
        .populate('client_id', 'name email')
        .populate('resolved_by', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    res.json({ disputes, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/disputes/:id — admin updates status / resolves
const resolveDispute = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const validStatuses = ['in_review', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const dispute = await Dispute.findById(req.params.id).populate('client_id', 'name email _id');
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    dispute.status = status;
    if (resolution) dispute.resolution = resolution;
    if (status === 'resolved' || status === 'closed') {
      dispute.resolved_by = req.user._id;
      dispute.resolved_at = new Date();
    }
    await dispute.save();

    // Notify the client
    if (dispute.client_id) {
      await Notification.create({
        user_id: dispute.client_id._id,
        title: `Dispute ${status === 'in_review' ? 'Under Review' : status === 'resolved' ? 'Resolved' : 'Closed'}`,
        message: status === 'in_review'
          ? 'Your dispute is now under review by our team.'
          : `Your dispute has been ${status}. ${resolution || ''}`,
      });
    }

    res.json(dispute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createDispute, getDisputes, resolveDispute };
