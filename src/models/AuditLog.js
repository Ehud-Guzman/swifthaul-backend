const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: [
      'assign_job', 'reassign_job', 'cancel_job',
      'create_user', 'activate_user', 'deactivate_user',
      'update_pricing',
    ],
    required: true,
  },
  target_type: { type: String, required: true },  // 'job', 'user', 'pricing'
  target_id: { type: String, required: true },
  details: { type: String, trim: true },
  timestamp: { type: Date, default: Date.now },
});

// Audit logs kept for 1 year, then auto-purged
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
