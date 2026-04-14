const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register  — clients self-register; admin creates owners/drivers
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, license_number } = req.body;

    // Only admin can create owner/driver accounts
    const selfRegisterRoles = ['client'];
    if (!selfRegisterRoles.includes(role)) {
      // Must be admin request (verified in route guard)
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create this account type' });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, password_hash, role });

    // If creating a driver, also create Driver profile
    if (role === 'driver') {
      if (!license_number) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'License number required for driver' });
      }
      await Driver.create({ user_id: user._id, license_number });
    }

    res.status(201).json({ message: 'Account created successfully', user: { id: user._id, name, email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login — accepts email OR phone
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }
    const query = email ? { email } : { phone };
    const user = await User.findOne(query);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid token' });

    const tokens = generateTokens(user._id);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user._id);

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, refresh, changePassword };
