'use strict';

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary SDK with credentials from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Multer-Cloudinary storage engine.
 * – Images land in the `driveclone/` folder on Cloudinary.
 * – Original filename (without extension) is used as the public_id so it
 *   stays human-readable while Cloudinary deduplicates via timestamps.
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const baseName = file.originalname.replace(/\.[^/.]+$/, '');   // strip extension
    return {
      folder:    'driveclone',
      public_id: `${Date.now()}-${baseName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
    };
  },
});

/** File-type guard — only allow images */
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

/** Ready-to-use multer instance (10 MB limit) */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
});

module.exports = { cloudinary, upload };
