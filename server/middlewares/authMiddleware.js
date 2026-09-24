const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { formatWithId } = require('../utils/formatters');

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
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
