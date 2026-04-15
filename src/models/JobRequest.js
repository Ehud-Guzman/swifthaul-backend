const mongoose = require('mongoose');

const jobRequestSchema = new mongoose.Schema({
  // Authenticated client OR guest — one of the two must be set
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  is_guest: { type: Boolean, default: false },
  guest_name: { type: String, trim: true },
  guest_email: { type: String, trim: true },
  guest_phone: { type: String, trim: true },
  cargo_type: {
    type: String,
    enum: ['general', 'heavy_equipment', 'fragile', 'perishable', 'other'],
    required: true,
  },
  weight_kg: { type: Number, required: true },
  pickup_location: { type: String, required: true, trim: true },
  dropoff_location: { type: String, required: true, trim: true },
  preferred_date: { type: Date, required: true },
  notes: { type: String, trim: true },
  suggested_price: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending',
  },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assigned_at: { type: Date, default: null },
  // Reserved for future M-Pesa / Stripe integration
  payment_intent: { type: String, default: null },
  // Tracks the last active status before cancellation so the timeline can show progress
  cancelled_from_status: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('JobRequest', jobRequestSchema);
