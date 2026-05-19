'use strict';

const User                            = require('../models/User');
const { attachTokenCookie,
        clearTokenCookie }            = require('../utils/token');
const { AppError, asyncHandler }      = require('../utils/AppError');

// ── POST /api/auth/register ───────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  // Basic presence check (Mongoose validators handle deeper rules)
  if (!fullName || !email || !password) {
    throw new AppError('fullName, email, and password are all required.', 400);
  }

  // Reject if email already in use (gives a clearer message than the
  // duplicate-key handler in production error middleware)
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('An account with that email already exists.', 409);
  }

  const user = await User.create({ fullName, email, password });

  const token = attachTokenCookie(res, user._id);

  res.status(201).json({
    status: 'success',
    token,
    user,   // password is excluded via schema transform
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  // Explicitly select password (it's hidden by default via `select: false`)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    // Deliberate vague message — don't reveal which field is wrong
    throw new AppError('Invalid email or password.', 401);
  }

  const token = attachTokenCookie(res, user._id);

  // Re-fetch without password for the response body
  const safeUser = await User.findById(user._id);

  res.status(200).json({
    status: 'success',
    token,
    user: safeUser,
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────

const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────

const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by the protect middleware (lean doc, no password)
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found.', 404);

  res.status(200).json({ status: 'success', user });
});

module.exports = { register, login, logout, getMe };
