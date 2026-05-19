'use strict';

const express = require('express');
const {
  getStarred,
  toggleStar,
  getTrash,
  moveToTrash,
  restoreFromTrash,
  permanentlyDelete,
  getRecent,
  getUsage,
} = require('../controllers/storageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All storage routes require authentication
router.use(protect);

// ── Starred routes ────────────────────────────────────────────────────────
router.get('/starred', getStarred);
router.get('/usage', getUsage);
router.patch('/toggle-star/:type/:id', toggleStar);

// ── Trash routes ──────────────────────────────────────────────────────────
router.get('/trash', getTrash);
router.delete('/trash/:type/:id', moveToTrash);
router.patch('/restore/:type/:id', restoreFromTrash);
router.delete('/permanent/:type/:id', permanentlyDelete);

// ── Recent routes ─────────────────────────────────────────────────────────
router.get('/recent', getRecent);

module.exports = router;
