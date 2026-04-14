const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid or inactive account' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
};

module.exports = { authenticate };
