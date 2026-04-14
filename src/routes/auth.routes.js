const express = require('express');
const router = express.Router();
const { register, login, refresh, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
