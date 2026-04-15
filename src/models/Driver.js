const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  license_number: { type: String, required: true, trim: true, unique: true },
  is_available: { type: Boolean, default: true },
});

module.exports = mongoose.model('Driver', driverSchema);
