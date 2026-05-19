'use strict';

const mongoose = require('mongoose');

/**
 * Establishes a MongoDB connection using Mongoose.
 * Exits the process on failure so the app never starts in a broken state.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 7+ has these as defaults, but explicit is better
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] Connected → ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] Connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
