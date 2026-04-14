const express = require('express');
const router = express.Router();
const { publicEstimate, submitGuestQuote, trackJob } = require('../controllers/public.controller');

// No authentication required on any of these routes
router.post('/estimate', publicEstimate);
router.post('/quote', submitGuestQuote);
router.get('/track/:id', trackJob);

module.exports = router;
