const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../utils/prisma');
const { formatWithId } = require('../../utils/formatters');
const admin = require('../../config/firebaseAdmin');

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
    avatar: user.avatar || 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000',
    vehicleType: user.vehicleType || 'Bike'
  });
};

// @desc Register User with optional Firebase ID Token verification
// @route POST /api/auth/register
const registerUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      idToken,
      vehicleType,
      shopName,
      vendorType,
      address,
      city,
      state,
      pincode,
      vehicleNumber,
      dlNumber
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    let verifiedPhoneFromToken = null;

    // Verify phone ownership via Firebase Admin SDK if idToken provided
    if (idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        verifiedPhoneFromToken = decodedToken.phone_number;
      } catch (fbErr) {
        console.error('[Register] Firebase idToken verification failed:', fbErr.message);
        return res.status(401).json({
          success: false,
          message: `Phone verification token invalid (${fbErr.message}). Please re-verify via SMS OTP.`
        });
      }
    }

    const rawPhone = (verifiedPhoneFromToken || phone || '').toString().trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (!rawPhone || digitsOnly.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid mobile phone number (at least 10 digits) is strictly required to register.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.'
      });
    }

    const formattedPhone = verifiedPhoneFromToken
      ? verifiedPhoneFromToken
      : rawPhone.startsWith('+')
      ? rawPhone
      : (digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`);

    const existingPhone = await prisma.user.findFirst({ where: { phone: formattedPhone } });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'This mobile phone number is already registered. Please login or use another number.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const prismaRole = mapToPrismaRole(role);

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        fullName: name.trim(),
        email: cleanEmail,
        phone: formattedPhone,
        passwordHash: hashedPassword,
        role: prismaRole,
        vehicleType: vehicleType || 'Bike',
        status: (prismaRole === 'VENDOR' || prismaRole === 'DELIVERY_PARTNER') ? 'pending_verification' : 'active'
      }
    });

    // If registering as VENDOR, create Vendor and VendorApplication records
    if (prismaRole === 'VENDOR') {
      const storeName = (shopName && shopName.trim()) || `${name.trim()}'s Store`;
      const isFresh = (vendorType && vendorType.toUpperCase().includes('FRESH'));

      // Create Vendor Store Record
      await prisma.vendor.create({
        data: {
          id: crypto.randomUUID(),
          ownerUserId: user.id,
          name: storeName,
          phone: formattedPhone,
          email: cleanEmail,
          address: (address && address.trim()) || 'Pending Onboarding',
          city: (city && city.trim()) || 'Noida',
          state: state || 'UP',
          pincode: pincode || '201301',
          vendorType: isFresh ? 'FRESH' : 'CRAVINGS',
          status: 'pending_verification',
          image: isFresh
            ? 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=500&auto=format&fit=crop&q=60'
            : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60'
        }
      }).catch(e => console.warn('[Auto Application] Vendor store create notice:', e.message));

      // Create Vendor Application for Admin Hub review
      await prisma.vendorApplication.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          fullName: name.trim(),
          businessName: storeName,
          vendorType: isFresh ? 'FRESH' : 'CRAVINGS',
          phone: formattedPhone,
          email: cleanEmail,
          address: (address && address.trim()) || 'Pending Onboarding',
          city: (city && city.trim()) || 'Noida',
          state: state || 'UP',
          pincode: pincode || '201301',
          status: 'PENDING'
        }
      }).catch(e => console.warn('[Auto Application] Vendor create notice:', e.message));
    } else if (prismaRole === 'DELIVERY_PARTNER') {
      await prisma.deliveryPartnerApplication.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          fullName: name.trim(),
          phone: formattedPhone,
          email: cleanEmail,
          address: (address && address.trim()) || 'Pending Onboarding',
          vehicleType: vehicleType || 'Bike',
          vehicleNumber: (vehicleNumber && vehicleNumber.trim()) || 'Pending Registration',
          dlNumber: (dlNumber && dlNumber.trim()) || 'Pending Verification',
          status: 'PENDING'
        }
      }).catch(e => console.warn('[Auto Application] Delivery Partner create notice:', e.message));
    }

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

// @desc Reset Password using verified Firebase idToken
// @route POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { idToken, role, newPassword } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Phone verification token (idToken) is required.'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (fbErr) {
      console.error('[Reset Password] Firebase token verification error:', fbErr.message);
      return res.status(401).json({
        success: false,
        message: `Phone verification token invalid (${fbErr.message}). Please re-verify via OTP.`
      });
    }

    const verifiedPhone = decodedToken.phone_number;
    if (!verifiedPhone) {
      return res.status(400).json({
        success: false,
        message: 'No verified phone number found in authentication token.'
      });
    }

    const digitsOnly = verifiedPhone.replace(/\D/g, '');
    const phoneCandidates = [
      verifiedPhone,
      digitsOnly,
      digitsOnly.length === 12 && digitsOnly.startsWith('91') ? digitsOnly.slice(2) : null,
      digitsOnly.length === 10 ? `+91${digitsOnly}` : null
    ].filter(Boolean);

    const prismaRole = role ? mapToPrismaRole(role) : null;
    let user = null;

    if (prismaRole) {
      user = await prisma.user.findFirst({
        where: {
          phone: { in: phoneCandidates },
          role: prismaRole
        }
      });
    }

    // Fallback: locate account by verified phone number variants if role was generic or unspecified
    if (!user) {
      user = await prisma.user.findFirst({
        where: { phone: { in: phoneCandidates } }
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No registered account found with verified number ${verifiedPhone}. Please create an account.`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword
      }
    });

    return res.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc Login User
// @route POST /api/auth/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password, requestedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || user.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isAdminAccount = user.role === 'ADMIN' || cleanEmail.startsWith('admin') || cleanEmail.startsWith('root_admin');

    if (!isAdminAccount && requestedRole && requestedRole !== 'any' && requestedRole !== 'all') {
      const targetPrismaRole = mapToPrismaRole(requestedRole);
      if (user.role !== targetPrismaRole) {
        return res.status(401).json({
          success: false,
          message: `Role mismatch: This account is registered as ${user.role}, not ${targetPrismaRole}`
        });
      }
    }

    if (isAdminAccount && user.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
      user.role = 'ADMIN';
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

// @desc Quick Demo Login disabled for security
// @route POST /api/auth/demo-login
const demoLogin = async (req, res) => {
  return res.status(400).json({ success: false, message: 'Demo role switching is disabled. Authenticate with actual credentials.' });
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

module.exports = { registerUser, resetPassword, loginUser, demoLogin, getMe };
