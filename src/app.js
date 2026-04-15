const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const vehicleRoutes = require('./routes/vehicles.routes');
const jobRoutes = require('./routes/jobs.routes');
const pricingRoutes = require('./routes/pricing.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notifications.routes');
const publicRoutes = require('./routes/public.routes');
const payoutsRoutes = require('./routes/payouts.routes');
const disputesRoutes = require('./routes/disputes.routes');
const adminRoutes = require('./routes/auditlog.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', system: 'SwiftHaul API' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
