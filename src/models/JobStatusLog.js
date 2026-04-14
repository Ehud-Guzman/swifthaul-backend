const mongoose = require('mongoose');

const jobStatusLogSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest', required: true },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  old_status: { type: String, required: true },
  new_status: { type: String, required: true },
  note: { type: String, trim: true },
  // Reserved for GPS coordinates — future
  location: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('JobStatusLog', jobStatusLogSchema);
