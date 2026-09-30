const errorHandler = (err, req, res, next) => {
  console.error('SERVER_ERROR:', err.message || err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let userFriendlyMessage = err.message || 'Internal Server Error';

  // Sanitize Prisma database errors
  if (err.code === 'P2002') {
    statusCode = 400;
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || 'field');
    if (target.includes('phone')) {
      userFriendlyMessage = 'This mobile phone number is already registered. Please login or use a different phone number.';
    } else if (target.includes('email')) {
      userFriendlyMessage = 'This email address is already registered. Please login or use a different email.';
    } else {
      userFriendlyMessage = `An account with this ${target} already exists. Please choose another.`;
    }
  } else if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    userFriendlyMessage = 'Invalid data provided. Please check all required form fields.';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    userFriendlyMessage = 'Requested record not found.';
  }

  res.status(statusCode).json({
    success: false,
    message: userFriendlyMessage,
    errorType: err.code || err.name || 'Error'
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
