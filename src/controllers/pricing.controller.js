const PricingRule = require('../models/PricingRule');

// GET /api/pricing
const getPricing = async (req, res) => {
  try {
    const rules = await PricingRule.find().populate('updated_by', 'name');
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/pricing/:vehicle_type — admin sets/updates a rule
const upsertPricing = async (req, res) => {
  try {
    const { vehicle_type } = req.params;
    const { base_rate_ksh, rate_per_kg, rate_per_km } = req.body;

    const rule = await PricingRule.findOneAndUpdate(
      { vehicle_type },
      { base_rate_ksh, rate_per_kg, rate_per_km, updated_by: req.user._id, updated_at: new Date() },
      { new: true, upsert: true }
    );
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/pricing/estimate — client gets price estimate before submitting
const getEstimate = async (req, res) => {
  try {
    const { vehicle_type, weight_kg } = req.body;
    if (!vehicle_type || !weight_kg) {
      return res.status(400).json({ message: 'vehicle_type and weight_kg are required' });
    }

    const rule = await PricingRule.findOne({ vehicle_type });
    if (!rule) {
      return res.status(404).json({ message: 'No pricing rule found for this vehicle type' });
    }

    const estimated_price = rule.base_rate_ksh + weight_kg * rule.rate_per_kg;
    res.json({ vehicle_type, weight_kg, estimated_price, rule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPricing, upsertPricing, getEstimate };
