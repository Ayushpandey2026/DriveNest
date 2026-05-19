'use strict';

const jwt = require('jsonwebtoken');

/**
 * Sign a JWT for the given userId.
 * @param {string|ObjectId} userId
 * @returns {string} signed JWT
 */
function signToken(userId) {
  return jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Set an httpOnly cookie containing the JWT and return the token.
 * @param {import('express').Response} res
 * @param {string|ObjectId} userId
 * @returns {string} the signed token (for JSON response body too)
 */
function attachTokenCookie(res, userId) {
  const token = signToken(userId);

  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge:   Number(process.env.COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

/**
 * Clear the auth cookie (used on logout).
 * @param {import('express').Response} res
 */
function clearTokenCookie(res) {
  res.cookie('token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    expires:  new Date(0),
  });
}

module.exports = { signToken, attachTokenCookie, clearTokenCookie };
