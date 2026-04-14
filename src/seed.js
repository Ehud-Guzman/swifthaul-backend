require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const PricingRule = require('./models/PricingRule');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swifthaul';

const defaultPricing = [
  { vehicle_type: 'mini_van',     base_rate_ksh: 2000, rate_per_kg: 5,  rate_per_km: 0 },
  { vehicle_type: 'truck_3t',     base_rate_ksh: 4000, rate_per_kg: 8,  rate_per_km: 0 },
  { vehicle_type: 'flatbed',      base_rate_ksh: 6000, rate_per_kg: 10, rate_per_km: 0 },
  { vehicle_type: 'semi_trailer', base_rate_ksh: 9000, rate_per_kg: 12, rate_per_km: 0 },
];

const seed = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // --- Admin user (upsert — always ensures password_hash is set) ---
  const password_hash = await bcrypt.hash('12345678', 12);
  const admin = await User.findOneAndUpdate(
    { email: 'nyamuehud@gmail.com' },
    { name: 'Ehud Nyamu', email: 'nyamuehud@gmail.com', phone: '', password_hash, role: 'admin', is_active: true },
    { upsert: true, new: true }
  );
  console.log(`Admin ready: ${admin.email}`);

  // --- Default pricing rules ---
  for (const rule of defaultPricing) {
    await PricingRule.findOneAndUpdate(
      { vehicle_type: rule.vehicle_type },
      rule,
      { upsert: true, new: true }
    );
  }
  console.log('Pricing rules seeded');

  await mongoose.disconnect();
  console.log('\nSeed complete. Login with:');
  console.log('  Email:    nyamuehud@gmail.com');
  console.log('  Password: 12345678');
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
