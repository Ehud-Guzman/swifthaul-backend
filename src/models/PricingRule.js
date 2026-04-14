const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  vehicle_type: {
    type: String,
    enum: ['mini_van', 'truck_3t', 'flatbed', 'semi_trailer'],
    required: true,
    unique: true,
  },
  base_rate_ksh: { type: Number, required: true, default: 0 },
  rate_per_kg: { type: Number, required: true, default: 0 },
  rate_per_km: { type: Number, default: 0 }, // reserved for distance pricing
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
