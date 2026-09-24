const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'krawing_hyperlocal_secret_key_2026_jwt_token_auth', {
    expiresIn: '7d'
  });
};

// @desc Register User
// @route POST /api/auth/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, vehicleType } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'consumer',
        phone: phone || '',
        vehicleType: vehicleType || 'Bike'
      }
    });

    const token = generateToken(user.id);
    const formattedUser = formatWithId({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar
    });

    res.status(201).json({
      success: true,
      token,
      user: formattedUser
    });
  } catch (err) {
    next(err);
  }
};

// @desc Login User
// @route POST /api/auth/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    const formattedUser = formatWithId({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      currentLocation: {
        lat: user.lat,
        lng: user.lng,
        addressText: user.addressText
      }
    });

    res.json({
      success: true,
      token,
      user: formattedUser
    });
  } catch (err) {
    next(err);
  }
};

// @desc Quick Demo Login (for switching roles instantly in UI)
// @route POST /api/auth/demo-login
const demoLogin = async (req, res, next) => {
  try {
    const { role } = req.body;
    let user = await prisma.user.findFirst({ where: { role: role || 'consumer' } });

    if (!user) {
      return res.status(404).json({ success: false, message: `No demo user found for role ${role}` });
    }

    const token = generateToken(user.id);

    const formattedUser = formatWithId({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      currentLocation: {
        lat: user.lat,
        lng: user.lng,
        addressText: user.addressText
      }
    });

    res.json({
      success: true,
      token,
      user: formattedUser
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get Current Logged In User
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    const formattedUser = formatWithId({
      ...userWithoutPassword,
      currentLocation: {
        lat: user.lat,
        lng: user.lng,
        addressText: user.addressText
      }
    });

    res.json({ success: true, user: formattedUser });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, demoLogin, getMe };
