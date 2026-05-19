'use strict';

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');

const { requestLogger }    = require('./middleware/logger');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { AppError }         = require('./utils/AppError');

const authRoutes            = require('./routes/authRoutes');
const folderRoutes          = require('./routes/folderRoutes');
const storageRoutes         = require('./routes/storageRoutes');
const { imageRouter,
        folderImageRouter } = require('./routes/imageRoutes');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,                // allow cookies cross-origin
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Request logger ────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/storage',  storageRoutes);
app.use('/api/folders',  folderRoutes);

// Nested: /api/folders/:folderId/images
app.use('/api/folders/:folderId/images', folderImageRouter);

// Standalone image actions: /api/images/:id
app.use('/api/images', imageRouter);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
