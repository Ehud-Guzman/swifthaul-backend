const PayoutRequest = require('../models/PayoutRequest');
const EarningsLog = require('../models/EarningsLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

// POST /api/payouts — owner requests a payout
const createPayout = async (req, res) => {
  try {
    const { amount_ksh, note } = req.body;
    if (!amount_ksh || amount_ksh <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const payout = await PayoutRequest.create({
      owner_id: req.user._id,
      amount_ksh,
      note,
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin', is_active: true });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin._id,
        title: 'Payout Request',
        message: `${req.user.name} has requested a payout of KSH ${amount_ksh}.`,
      });
    }

    res.status(201).json(payout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/payouts — owner sees own; admin sees all (with pagination)
const getPayouts = async (req, res) => {
  try {
    const filter = req.user.role === 'owner' ? { owner_id: req.user._id } : {};
    if (req.user.role === 'admin' && req.query.status) filter.status = req.query.status;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      PayoutRequest.find(filter)
        .populate('owner_id', 'name email')
        .populate('reviewed_by', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      PayoutRequest.countDocuments(filter),
    ]);

    res.json({ payouts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/payouts/:id — admin approves or rejects
const reviewPayout = async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const payout = await PayoutRequest.findById(req.params.id).populate('owner_id', 'name email');
    if (!payout) return res.status(404).json({ message: 'Payout request not found' });
    if (payout.status !== 'pending') {
      return res.status(400).json({ message: 'This payout has already been reviewed' });
    }

    payout.status = status;
    payout.admin_note = admin_note;
    payout.reviewed_by = req.user._id;
    payout.reviewed_at = new Date();
    await payout.save();

    // Notify the owner
    await Notification.create({
      user_id: payout.owner_id._id,
      title: `Payout ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: status === 'approved'
        ? `Your payout request for KSH ${payout.amount_ksh} has been approved.`
        : `Your payout request for KSH ${payout.amount_ksh} was rejected. ${admin_note || ''}`,
    });

    res.json(payout);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/payouts/summary — owner gets their total earnings vs total paid out
const getPayoutSummary = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner_id: req.user._id }).select('_id');
    const vehicleIds = vehicles.map((v) => v._id);

    const [earningsResult, paidResult] = await Promise.all([
      EarningsLog.aggregate([
        { $match: { vehicle_id: { $in: vehicleIds } } },
        { $group: { _id: null, total: { $sum: '$amount_ksh' } } },
      ]),
      PayoutRequest.aggregate([
        { $match: { owner_id: req.user._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount_ksh' } } },
      ]),
    ]);

    const totalEarned = earningsResult[0]?.total || 0;
    const totalPaid = paidResult[0]?.total || 0;

    res.json({ totalEarned, totalPaid, balance: totalEarned - totalPaid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createPayout, getPayouts, reviewPayout, getPayoutSummary };
