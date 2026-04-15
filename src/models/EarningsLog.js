const mongoose = require('mongoose');

const earningsLogSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest', required: true },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount_ksh: { type: Number, required: true },           // owner's cut
  driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  driver_cut_ksh: { type: Number, default: 0 },           // driver's cut (70% of job price)
  recorded_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EarningsLog', earningsLogSchema);
