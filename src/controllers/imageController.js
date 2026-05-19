'use strict';

const mongoose                       = require('mongoose');
const Image                          = require('../models/Image');
const Folder                         = require('../models/Folder');
const { AppError, asyncHandler }     = require('../utils/AppError');
const { cloudinary }                 = require('../config/cloudinary');

// ── Helper ────────────────────────────────────────────────────────────────

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

// ── POST /api/folders/:folderId/images ────────────────────────────────────

const uploadImage = asyncHandler(async (req, res) => {
  // multer has already uploaded to Cloudinary and attached req.file
  if (!req.file) {
    throw new AppError('No image file provided.', 400);
  }

  const folderOid = toObjectId(req.params.folderId);
  if (!folderOid) throw new AppError('Invalid folder ID.', 400);

  // Ownership check — only the folder owner can upload into it
  const folder = await Folder.findOne({ _id: folderOid, userId: req.user._id });
  if (!folder) throw new AppError('Folder not found or access denied.', 404);

  // Determine image name: from body > original filename > fallback
  const rawName     = req.body.name?.trim();
  const originalBase = req.file.originalname?.replace(/\.[^/.]+$/, '') || 'image';
  const name        = rawName || originalBase;

  // Cloudinary returns file size as `req.file.size` via multer-storage-cloudinary
  // Some versions expose it; fall back to 0 gracefully.
  const size = req.file.size || req.file.bytes || 0;

  const image = await Image.create({
    name,
    imageUrl:           req.file.path,          // Cloudinary secure URL
    cloudinaryPublicId: req.file.filename,      // public_id for later deletion
    size,
    folderId: folderOid,
    userId:   req.user._id,
  });

  res.status(201).json({ status: 'success', image });
});

// ── GET /api/folders/:folderId/images ─────────────────────────────────────

const getImages = asyncHandler(async (req, res) => {
  const folderOid = toObjectId(req.params.folderId);
  if (!folderOid) throw new AppError('Invalid folder ID.', 400);

  // Verify folder ownership before listing
  const folder = await Folder.findOne({ _id: folderOid, userId: req.user._id, isDeleted: false });
  if (!folder) throw new AppError('Folder not found or access denied.', 404);

  const images = await Image.find({ folderId: folderOid, userId: req.user._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ status: 'success', count: images.length, images });
});

// ── GET /api/images/:id ───────────────────────────────────────────────────

const getImageById = asyncHandler(async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) throw new AppError('Invalid image ID.', 400);

  const image = await Image.findOne({ _id: oid, userId: req.user._id, isDeleted: false });
  if (!image) throw new AppError('Image not found or access denied.', 404);

  // Update lastAccessedAt
  await Image.updateOne({ _id: oid }, { lastAccessedAt: new Date() });

  res.status(200).json({ status: 'success', image });
});

// ── DELETE /api/images/:id ────────────────────────────────────────────────

const deleteImage = asyncHandler(async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) throw new AppError('Invalid image ID.', 400);

  // Fetch with cloudinaryPublicId (normally hidden)
  const image = await Image.findOne({ _id: oid, userId: req.user._id })
    .select('+cloudinaryPublicId');

  if (!image) throw new AppError('Image not found or access denied.', 404);

  // Remove from Cloudinary (best-effort — don't fail if already gone)
  if (image.cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(image.cloudinaryPublicId);
    } catch (err) {
      console.warn(`[Cloudinary] Could not delete asset ${image.cloudinaryPublicId}:`, err.message);
    }
  }

  await image.deleteOne();

  res.status(200).json({ status: 'success', message: 'Image deleted successfully.' });
});

module.exports = { uploadImage, getImages, getImageById, deleteImage };
