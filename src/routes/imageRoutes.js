'use strict';

const express = require('express');
const { uploadImage, getImages, getImageById, deleteImage } = require('../controllers/imageController');
const { protect } = require('../middleware/auth');
const { upload }  = require('../config/cloudinary');
const { trackImageAccess } = require('../controllers/storageController');

// ── Router for standalone image actions (/api/images) ─────────────────────
const imageRouter = express.Router();
imageRouter.use(protect);

imageRouter.route('/:id')
  .get(trackImageAccess, getImageById)   // GET    /api/images/:id (tracks access)
  .delete(deleteImage); // DELETE /api/images/:id

// ── Router merged into folder routes (/api/folders/:folderId/images) ──────
const folderImageRouter = express.Router({ mergeParams: true });
folderImageRouter.use(protect);

/**
 * upload.single('image') — multer middleware.
 * The field name must be "image" in the multipart form.
 * It streams directly to Cloudinary before the controller runs.
 */
folderImageRouter.route('/')
  .post(upload.single('image'), uploadImage)   // POST  /api/folders/:folderId/images
  .get(getImages);                             // GET   /api/folders/:folderId/images

module.exports = { imageRouter, folderImageRouter };
