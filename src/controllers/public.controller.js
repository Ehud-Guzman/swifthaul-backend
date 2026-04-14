const JobRequest = require('../models/JobRequest');
const JobStatusLog = require('../models/JobStatusLog');
const PricingRule = require('../models/PricingRule');
const User = require('../models/User');
const { sendEmail, newJobRequestEmail } = require('../services/email.service');

// POST /api/public/estimate — no auth required
const publicEstimate = async (req, res) => {
  try {
    const { vehicle_type, weight_kg } = req.body;
    if (!vehicle_type || !weight_kg) {
      return res.status(400).json({ message: 'vehicle_type and weight_kg are required' });
    }
    const rule = await PricingRule.findOne({ vehicle_type });
    if (!rule) return res.status(404).json({ message: 'No pricing rule for that vehicle type' });

    const estimated_price = rule.base_rate_ksh + Number(weight_kg) * rule.rate_per_kg;
    res.json({ vehicle_type, weight_kg: Number(weight_kg), estimated_price });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/public/quote — guest submits a job request without an account
const submitGuestQuote = async (req, res) => {
  try {
    const {
      guest_name, guest_email, guest_phone,
      cargo_type, weight_kg, pickup_location,
      dropoff_location, preferred_date, notes, vehicle_type,
    } = req.body;

    if (!guest_name || !guest_email || !guest_phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }
    if (!cargo_type || !weight_kg || !pickup_location || !dropoff_location || !preferred_date) {
      return res.status(400).json({ message: 'All job details are required' });
    }

    // Calculate suggested price
    let suggested_price = 0;
    if (vehicle_type) {
      const rule = await PricingRule.findOne({ vehicle_type });
      if (rule) {
        suggested_price = rule.base_rate_ksh + Number(weight_kg) * rule.rate_per_kg;
      }
    }

    const job = await JobRequest.create({
      is_guest: true,
      guest_name,
      guest_email,
      guest_phone,
      cargo_type,
      weight_kg: Number(weight_kg),
      pickup_location,
      dropoff_location,
      preferred_date,
      notes,
      suggested_price,
    });

    // Notify all admins of the new guest request
    const admins = await User.find({ role: 'admin', is_active: true });
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        ...newJobRequestEmail(admin.name, { ...job.toObject(), pickup_location, dropoff_location }),
      });
    }

    res.status(201).json({
      tracking_id: job._id,
      message: 'Your request has been submitted. Use your tracking ID to check the status.',
      suggested_price,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/public/track/:id — anyone can check job status
const trackJob = async (req, res) => {
  try {
    const job = await JobRequest.findById(req.params.id).select(
      'status cargo_type weight_kg pickup_location dropoff_location preferred_date suggested_price is_guest guest_name created_at updated_at'
    );

    if (!job) return res.status(404).json({ message: 'Job not found. Check your tracking ID.' });

    // Return status timeline without sensitive user IDs
    const logs = await JobStatusLog.find({ job_id: job._id })
      .select('old_status new_status note timestamp')
      .sort({ timestamp: 1 });

    res.json({ job, logs });
  } catch (err) {
    // Handles malformed ObjectId gracefully
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Invalid tracking ID format.' });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { publicEstimate, submitGuestQuote, trackJob };
