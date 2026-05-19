'use strict';

const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const { AppError } = require('../utils/AppError');

/**
 * Protect routes — verifies JWT from httpOnly cookie OR Authorization header.
 * On success, attaches `req.user` (lean user doc without password).
 */
async function protect(req, res, next) {
  try {
    // 1. Extract token (cookie takes priority over header)
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return next(new AppError('Not authenticated. Please log in.', 401));
    }

    // 2. Verify signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return next(new AppError(message, 401));
    }

    // 3. Check user still exists
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      return next(new AppError('The account belonging to this token no longer exists.', 401));
    }

    // 4. Attach to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { protect };
