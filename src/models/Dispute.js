const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest', required: true },
  // Registered client or guest
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  is_guest: { type: Boolean, default: false },
  guest_email: { type: String, trim: true },
  guest_name: { type: String, trim: true },
  type: {
    type: String,
    enum: ['damage', 'delay', 'missing_item', 'wrong_delivery', 'overcharge', 'other'],
    required: true,
  },
  description: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['open', 'in_review', 'resolved', 'closed'],
    default: 'open',
  },
  resolution: { type: String, trim: true },
  resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolved_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Dispute', disputeSchema);
