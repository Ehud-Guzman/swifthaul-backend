const User = require('../models/User');
const Driver = require('../models/Driver');

// GET /api/users  — admin only; filter by role
const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password_hash').sort({ created_at: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/users — admin creates owner/driver
const createUser = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, phone, password, role, license_number } = req.body;

    if (!['owner', 'driver'].includes(role)) {
      return res.status(400).json({ message: 'Admin can only create owner or driver accounts' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, password_hash, role });

    if (role === 'driver') {
      if (!license_number) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'License number required for driver' });
      }
      await Driver.create({ user_id: user._id, license_number });
    }

    res.status(201).json({ message: 'User created', user: { id: user._id, name, email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/users/:id
const updateUser = async (req, res) => {
  try {
    const allowed = ['name', 'email', 'phone', 'is_active'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password_hash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id — soft delete
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, createUser, getUserById, updateUser, deleteUser };
