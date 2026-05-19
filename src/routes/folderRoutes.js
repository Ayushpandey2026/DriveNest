'use strict';

const express = require('express');
const {
  createFolder,
  getFolders,
  getFolderById,
  renameFolder,
  deleteFolder,
} = require('../controllers/folderController');
const { protect } = require('../middleware/auth');
const { trackFolderAccess } = require('../controllers/storageController');

const router = express.Router();

// All folder routes require authentication
router.use(protect);

router.route('/')
  .post(createFolder)   // POST   /api/folders          — create folder
  .get(getFolders);     // GET    /api/folders?parentId= — list folders

router.route('/:id')
  .get(trackFolderAccess, getFolderById)   // GET    /api/folders/:id  — folder + subfolders + images (tracks access)
  .patch(renameFolder)  // PATCH  /api/folders/:id  — rename
  .delete(deleteFolder); // DELETE /api/folders/:id  — cascade delete

module.exports = router;
