'use strict';

/**
 * Operational (expected) error with an HTTP status code.
 * Anything thrown as AppError is handled gracefully by the global error
 * middleware; every other Error is treated as an unexpected 500.
 */
class AppError extends Error {
  /**
   * @param {string}  message    Human-readable error description
   * @param {number}  statusCode HTTP status code (4xx / 5xx)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode  = statusCode;
    this.status      = statusCode >= 500 ? 'error' : 'fail';
    this.isOperational = true;

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps an async route handler so rejected promises are forwarded to next().
 * Eliminates the need for try/catch in every controller.
 *
 * @param {Function} fn  async (req, res, next) => ...
 * @returns {Function}   Express-compatible middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { AppError, asyncHandler };
