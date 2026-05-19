'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type:     String,
      required: [true, 'Full name is required'],
      trim:     true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:    false,   // never returned in queries by default
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Strip sensitive / internal fields when serialising
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Hooks ──────────────────────────────────────────────────────────────────

/** Hash password before every save (only when it has been modified) */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// ── Instance methods ───────────────────────────────────────────────────────

/**
 * Compare a plain-text candidate password with the stored hash.
 * Call after explicitly selecting the password field:
 *   User.findOne({ email }).select('+password')
 */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
