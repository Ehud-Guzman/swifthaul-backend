const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const AuditLog = require('../models/AuditLog');

// GET /api/users  — admin only; filter by role, supports pagination
const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password_hash').sort({ created_at: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
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

    await AuditLog.create({
      actor_id: req.user._id,
      action: 'create_user',
      target_type: 'user',
      target_id: user._id.toString(),
      details: `Created ${role} account for ${email}`,
    });

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

    // Deactivating a driver — mark them unavailable so they don't appear in assignment dropdowns
    if (updates.is_active === false && user.role === 'driver') {
      await Driver.findOneAndUpdate({ user_id: user._id }, { is_available: false });
    }

    if (updates.is_active !== undefined && req.user) {
      await AuditLog.create({
        actor_id: req.user._id,
        action: updates.is_active ? 'activate_user' : 'deactivate_user',
        target_type: 'user',
        target_id: user._id.toString(),
        details: `${updates.is_active ? 'Activated' : 'Deactivated'} ${user.role} ${user.email}`,
      });
    }

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
