const mongoose = require('mongoose');

const earningsLogSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest', required: true },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount_ksh: { type: Number, required: true },
  recorded_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EarningsLog', earningsLogSchema);
