const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'krawing_hyperlocal_secret_key_2026_jwt_token_auth', {
    expiresIn: '7d'
  });
};

const mapToPrismaRole = (inputRole) => {
  if (!inputRole) return 'CUSTOMER';
  const r = inputRole.toLowerCase();
  if (r === 'vendor') return 'VENDOR';
  if (r === 'delivery_partner' || r === 'driver') return 'DELIVERY_PARTNER';
  if (r === 'admin') return 'ADMIN';
  if (r === 'consumer' || r === 'customer') return 'CUSTOMER';
  return 'CUSTOMER';
};

const mapToFrontendRole = (prismaRole) => {
  if (!prismaRole) return 'consumer';
  const r = prismaRole.toUpperCase();
  if (r === 'CUSTOMER') return 'consumer';
  if (r === 'VENDOR') return 'vendor';
  if (r === 'DELIVERY_PARTNER') return 'delivery_partner';
  if (r === 'ADMIN') return 'admin';
  return prismaRole.toLowerCase();
};

const formatUserResponse = (user) => {
  return formatWithId({
    id: user.id,
    name: user.fullName || user.name || '',
    fullName: user.fullName || user.name || '',
    email: user.email,
    role: mapToFrontendRole(user.role),
    phone: user.phone || '',
    avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    vehicleType: user.vehicleType || 'Bike'
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
    const prismaRole = mapToPrismaRole(role);
    const userPhone = phone || `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        fullName: name,
        email: email.toLowerCase(),
        phone: userPhone,
        passwordHash: hashedPassword,
        role: prismaRole,
        vehicleType: vehicleType || 'Bike'
      }
    });

    const token = generateToken(user.id);
    const formattedUser = formatUserResponse(user);

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

    const isMatch = await bcrypt.compare(password, user.passwordHash || user.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const formattedUser = formatUserResponse(user);

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
    const targetPrismaRole = mapToPrismaRole(role);
    let user = await prisma.user.findFirst({ where: { role: targetPrismaRole } });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: `No demo user found for role ${role}` });
    }

    const token = generateToken(user.id);
    const formattedUser = formatUserResponse(user);

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

    const formattedUser = formatUserResponse(user);
    res.json({ success: true, user: formattedUser });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, demoLogin, getMe };
