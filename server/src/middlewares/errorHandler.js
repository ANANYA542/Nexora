const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.url} —`, err.message);
    if (!err.isOperational) console.error(err.stack);
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
      errors: null,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      errors: null,
    });
  }

  if (err.code === '42703' || err.code === '42P01') {
    return res.status(500).json({
      success: false,
      message: 'Database schema is out of date. Run the latest migrations and try again.',
      errors: null,
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      errors: null,
    });
  }

  let errors = null;
  if (err.isOperational && err.statusCode === 400) {
    try {
      errors = JSON.parse(err.message);
    } catch {}
  }

  const statusCode = err.isOperational ? err.statusCode : 500;
  const message = err.isOperational
    ? errors
      ? 'Validation failed'
      : err.message
    : 'Something went wrong. Please try again later.';

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors || null,
  });
};

module.exports = { errorHandler };
