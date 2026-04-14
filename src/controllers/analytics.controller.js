const JobRequest = require('../models/JobRequest');
const EarningsLog = require('../models/EarningsLog');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const User = require('../models/User');

// GET /api/analytics/overview
const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayJobs, weekJobs, monthJobs, byStatus, activeVehicles, monthRevenue] = await Promise.all([
      JobRequest.countDocuments({ created_at: { $gte: startOfDay } }),
      JobRequest.countDocuments({ created_at: { $gte: startOfWeek } }),
      JobRequest.countDocuments({ created_at: { $gte: startOfMonth } }),
      JobRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Vehicle.countDocuments({ status: 'assigned' }),
      EarningsLog.aggregate([
        { $match: { recorded_at: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount_ksh' } } },
      ]),
    ]);

    res.json({
      jobs: { today: todayJobs, week: weekJobs, month: monthJobs },
      byStatus: byStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      activeVehicles,
      monthRevenue: monthRevenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/jobs — jobs per day/week/month
const getJobsAnalytics = async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    const dateFormat = period === 'monthly' ? '%Y-%m' : period === 'weekly' ? '%Y-%U' : '%Y-%m-%d';

    const data = await JobRequest.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$created_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: Number(limit) },
    ]);

    res.json(data.map((d) => ({ date: d._id, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/revenue
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    const dateFormat = period === 'monthly' ? '%Y-%m' : period === 'weekly' ? '%Y-%U' : '%Y-%m-%d';

    const data = await EarningsLog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$recorded_at' } },
          revenue: { $sum: '$amount_ksh' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: Number(limit) },
    ]);

    res.json(data.map((d) => ({ date: d._id, revenue: d.revenue })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/vehicles — jobs by vehicle type
const getVehicleAnalytics = async (req, res) => {
  try {
    const data = await JobRequest.aggregate([
      { $match: { vehicle_id: { $ne: null } } },
      {
        $lookup: {
          from: 'vehicles', localField: 'vehicle_id', foreignField: '_id', as: 'vehicle',
        },
      },
      { $unwind: '$vehicle' },
      { $group: { _id: '$vehicle.type', count: { $sum: 1 } } },
    ]);

    res.json(data.map((d) => ({ type: d._id, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/drivers — top drivers by completed jobs
const getDriverAnalytics = async (req, res) => {
  try {
    const data = await JobRequest.aggregate([
      { $match: { status: 'delivered', driver_id: { $ne: null } } },
      { $group: { _id: '$driver_id', completed: { $sum: 1 } } },
      { $sort: { completed: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'drivers', localField: '_id', foreignField: '_id', as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $lookup: {
          from: 'users', localField: 'driver.user_id', foreignField: '_id', as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: { completed: 1, name: '$user.name', email: '$user.email' } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/owners — earnings per owner
const getOwnerAnalytics = async (req, res) => {
  try {
    const data = await EarningsLog.aggregate([
      { $group: { _id: '$owner_id', total_ksh: { $sum: '$amount_ksh' }, jobs: { $sum: 1 } } },
      { $sort: { total_ksh: -1 } },
      {
        $lookup: {
          from: 'users', localField: '_id', foreignField: '_id', as: 'owner',
        },
      },
      { $unwind: '$owner' },
      { $project: { total_ksh: 1, jobs: 1, name: '$owner.name', email: '$owner.email' } },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/export/jobs — CSV
const exportJobs = async (req, res) => {
  try {
    const jobs = await JobRequest.find({ status: 'delivered' })
      .populate('client_id', 'name email')
      .populate('vehicle_id', 'name plate_number')
      .lean();

    const header = 'ID,Client,Email,Cargo Type,Weight(kg),Pickup,Dropoff,Preferred Date,Price(KSH),Status\n';
    const rows = jobs.map((j) =>
      [
        j._id, j.client_id?.name, j.client_id?.email, j.cargo_type, j.weight_kg,
        `"${j.pickup_location}"`, `"${j.dropoff_location}"`,
        new Date(j.preferred_date).toDateString(), j.suggested_price, j.status,
      ].join(',')
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=swifthaul_jobs.csv');
    res.send(header + rows.join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/analytics/export/earnings — CSV
const exportEarnings = async (req, res) => {
  try {
    const earnings = await EarningsLog.find()
      .populate('owner_id', 'name email')
      .populate('vehicle_id', 'name plate_number')
      .populate('job_id', 'pickup_location dropoff_location preferred_date')
      .lean();

    const header = 'Job ID,Vehicle,Plate,Owner,Email,Amount(KSH),Recorded At\n';
    const rows = earnings.map((e) =>
      [
        e.job_id?._id, e.vehicle_id?.name, e.vehicle_id?.plate_number,
        e.owner_id?.name, e.owner_id?.email, e.amount_ksh,
        new Date(e.recorded_at).toDateString(),
      ].join(',')
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=swifthaul_earnings.csv');
    res.send(header + rows.join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getOverview, getJobsAnalytics, getRevenueAnalytics,
  getVehicleAnalytics, getDriverAnalytics, getOwnerAnalytics,
  exportJobs, exportEarnings,
};
