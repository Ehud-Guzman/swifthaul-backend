const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['mini_van', 'truck_3t', 'flatbed', 'semi_trailer'],
    required: true,
  },
  plate_number: { type: String, required: true, unique: true, uppercase: true, trim: true },
  capacity_kg: { type: Number, required: true },
  status: {
    type: String,
    enum: ['available', 'assigned', 'maintenance'],
    default: 'available',
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Vehicle', vehicleSchema);
