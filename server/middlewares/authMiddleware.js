const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { formatWithId } = require('../utils/formatters');

const normalizeRole = (role) => {
  if (!role) return '';
  const r = role.toString().toUpperCase().trim();
  if (r === 'CONSUMER' || r === 'CUSTOMER' || r === 'USER') return 'CUSTOMER';
  if (r === 'VENDOR' || r === 'SELLER' || r === 'RESTAURANT') return 'VENDOR';
  if (r === 'DELIVERY_PARTNER' || r === 'DELIVERY' || r === 'DRIVER') return 'DELIVERY_PARTNER';
  if (r === 'ADMIN') return 'ADMIN';
  return r;
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'krawing_hyperlocal_secret_key_2026_jwt_token_auth');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    const { password, ...userWithoutPassword } = user;
    req.user = formatWithId(userWithoutPassword);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);
    const allowedRoles = roles.map(normalizeRole);

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role || 'UNKNOWN'}) is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize, normalizeRole };

