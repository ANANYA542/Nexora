const AppError = require('../utils/AppError');

/**
 * errorHandler — centralized Express error-handling middleware.
 *
 * All errors thrown anywhere in the application end up here.
 * This keeps try-catch out of controllers and services.
 *
 * Two categories of errors:
 *   1. AppError (isOperational = true)  → known, expected errors → 4xx/5xx
 *   2. Unknown errors (bugs)            → always 500
 */
const errorHandler = (err, req, res, _next) => {
  // Log every error server-side for debugging
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.url} —`, err.message);
    if (!err.isOperational) console.error(err.stack);
  }

  // Handle Postgres unique violation (email already exists, etc.)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
      errors: null,
    });
  }

  // Handle Postgres foreign-key violation (invalid category_id, etc.)
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      errors: null,
    });
  }

  // Parse Zod validation error list stored as JSON string (from validate.js)
  let errors = null;
  if (err.isOperational && err.statusCode === 400) {
    try {
      errors = JSON.parse(err.message);
    } catch {
      /* message is a plain string, not a Zod list */
    }
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
