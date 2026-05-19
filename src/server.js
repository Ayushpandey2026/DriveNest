'use strict';

require('dotenv').config();

const connectDB = require('./config/db');
const app       = require('./app');
const cors      = require('cors');

const PORT = process.env.PORT || 5000;

// ── Unhandled rejection / exception guards ────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Shutting down…');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// ── Boot sequence ─────────────────────────────────────────────────────────

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Graceful shutdown on unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED REJECTION] Shutting down…');
    console.error(err.name, err.message);
    server.close(() => process.exit(1));
  });

  // Graceful shutdown on SIGTERM (Docker / cloud platforms)
  process.on('SIGTERM', () => {
    console.log('[SIGTERM] Graceful shutdown initiated');
    server.close(() => {
      console.log('[SIGTERM] Process terminated');
    });
  });
}

start();
