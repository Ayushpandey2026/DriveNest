'use strict';

const { AppError } = require('../utils/AppError');

// ── Mongoose / JWT error normalizers ──────────────────────────────────────

function handleCastError(err) {
  return new AppError(`Invalid value for field "${err.path}": ${err.value}`, 400);
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}`, 400);
}

function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(`"${value}" is already taken for ${field}. Please use a different value.`, 409);
}

function handleMulterError(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Maximum allowed size is 10 MB.', 400);
  }
  return new AppError(`File upload error: ${err.message}`, 400);
}

// ── Response senders ──────────────────────────────────────────────────────

function sendDevError(err, res) {
  res.status(err.statusCode).json({
    status:  err.status,
    message: err.message,
    stack:   err.stack,
    error:   err,
  });
}

function sendProdError(err, res) {
  if (err.isOperational) {
    // Known, safe-to-expose error
    res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
    });
  } else {
    // Programming / unexpected error — hide internals
    console.error('[ERROR]', err);
    res.status(500).json({
      status:  'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
}

// ── Main error-handling middleware ─────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendDevError(err, res);
    return;
  }

  // Normalise known Mongoose / Multer errors into AppErrors
  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);

  if (error.name === 'CastError')            error = handleCastError(error);
  if (error.name === 'ValidationError')      error = handleValidationError(error);
  if (error.code  === 11000)                 error = handleDuplicateKeyError(error);
  if (error.name  === 'MulterError')         error = handleMulterError(error);

  sendProdError(error, res);
}

module.exports = { globalErrorHandler };
