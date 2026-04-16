const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');


const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token missing', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = { authenticate };
