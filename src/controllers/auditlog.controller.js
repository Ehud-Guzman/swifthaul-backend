const AuditLog = require('../models/AuditLog');
const EarningsLog = require('../models/EarningsLog');
const Driver = require('../models/Driver');

// GET /api/audit-log — admin only
const getAuditLog = async (req, res) => {
  try {
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.actor_id) filter.actor_id = req.query.actor_id;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor_id', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/earnings/driver — driver gets their own earnings
const getDriverEarnings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user_id: req.user._id });
    if (!driver) return res.json({ earnings: [], total: 0, totalPay: 0 });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [earnings, total] = await Promise.all([
      EarningsLog.find({ driver_id: driver._id })
        .populate('job_id', 'pickup_location dropoff_location preferred_date cargo_type')
        .populate('vehicle_id', 'name plate_number type')
        .sort({ recorded_at: -1 })
        .skip(skip)
        .limit(limit),
      EarningsLog.countDocuments({ driver_id: driver._id }),
    ]);

    const totalPayResult = await EarningsLog.aggregate([
      { $match: { driver_id: driver._id } },
      { $group: { _id: null, total: { $sum: '$driver_cut_ksh' } } },
    ]);

    res.json({
      earnings,
      total,
      page,
      pages: Math.ceil(total / limit),
      totalPay: totalPayResult[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAuditLog, getDriverEarnings };
