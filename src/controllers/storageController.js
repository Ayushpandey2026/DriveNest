'use strict';

const mongoose                            = require('mongoose');
const Folder                              = require('../models/Folder');
const Image                               = require('../models/Image');
const { AppError, asyncHandler }          = require('../utils/AppError');
const { cloudinary }                      = require('../config/cloudinary');

// ── Helper ────────────────────────────────────────────────────────────────

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

// ── STARRED ITEMS ─────────────────────────────────────────────────────────

/**
 * GET /api/storage/starred
 * Get all starred folders and images
 */
const getStarred = asyncHandler(async (req, res) => {
  const [starredFolders, starredImages] = await Promise.all([
    Folder.find({ userId: req.user._id, isStarred: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean(),
    Image.find({ userId: req.user._id, isStarred: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res.status(200).json({
    status: 'success',
    folders: starredFolders,
    images: starredImages,
  });
});

/**
 * PATCH /api/storage/toggle-star/:type/:id
 * Toggle star on a folder or image
 * @param type 'folder' or 'image'
 */
const toggleStar = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const oid = toObjectId(id);
  if (!oid) throw new AppError('Invalid ID.', 400);

  if (type === 'folder') {
    const folder = await Folder.findOne({ _id: oid, userId: req.user._id });
    if (!folder) throw new AppError('Folder not found or access denied.', 404);

    folder.isStarred = !folder.isStarred;
    await folder.save();

    res.status(200).json({ status: 'success', folder });
  } else if (type === 'image') {
    const image = await Image.findOne({ _id: oid, userId: req.user._id });
    if (!image) throw new AppError('Image not found or access denied.', 404);

    image.isStarred = !image.isStarred;
    await image.save();

    res.status(200).json({ status: 'success', image });
  } else {
    throw new AppError('Invalid type. Use "folder" or "image".', 400);
  }
});

// ── TRASH / SOFT DELETE ───────────────────────────────────────────────────

/**
 * GET /api/storage/trash
 * Get all deleted (trashed) items
 */
const getTrash = asyncHandler(async (req, res) => {
  const [trashedFolders, trashedImages] = await Promise.all([
    Folder.find({ userId: req.user._id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .lean(),
    Image.find({ userId: req.user._id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .lean(),
  ]);

  res.status(200).json({
    status: 'success',
    folders: trashedFolders,
    images: trashedImages,
  });
});

/**
 * DELETE /api/storage/trash/:type/:id
 * Move item to trash (soft delete)
 */
const moveToTrash = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const oid = toObjectId(id);
  if (!oid) throw new AppError('Invalid ID.', 400);

  if (type === 'folder') {
    const folder = await Folder.findOne({ _id: oid, userId: req.user._id });
    if (!folder) throw new AppError('Folder not found or access denied.', 404);

    folder.isDeleted = true;
    folder.deletedAt = new Date();
    await folder.save();

    res.status(200).json({ status: 'success', message: 'Folder moved to trash.' });
  } else if (type === 'image') {
    const image = await Image.findOne({ _id: oid, userId: req.user._id });
    if (!image) throw new AppError('Image not found or access denied.', 404);

    image.isDeleted = true;
    image.deletedAt = new Date();
    await image.save();

    res.status(200).json({ status: 'success', message: 'Image moved to trash.' });
  } else {
    throw new AppError('Invalid type. Use "folder" or "image".', 400);
  }
});

/**
 * PATCH /api/storage/restore/:type/:id
 * Restore item from trash
 */
const restoreFromTrash = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const oid = toObjectId(id);
  if (!oid) throw new AppError('Invalid ID.', 400);

  if (type === 'folder') {
    const folder = await Folder.findOne({ _id: oid, userId: req.user._id });
    if (!folder) throw new AppError('Folder not found or access denied.', 404);

    folder.isDeleted = false;
    folder.deletedAt = null;
    await folder.save();

    res.status(200).json({ status: 'success', folder });
  } else if (type === 'image') {
    const image = await Image.findOne({ _id: oid, userId: req.user._id });
    if (!image) throw new AppError('Image not found or access denied.', 404);

    image.isDeleted = false;
    image.deletedAt = null;
    await image.save();

    res.status(200).json({ status: 'success', image });
  } else {
    throw new AppError('Invalid type. Use "folder" or "image".', 400);
  }
});

/**
 * DELETE /api/storage/permanent/:type/:id
 * Permanently delete item from trash
 */
const permanentlyDelete = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const oid = toObjectId(id);
  if (!oid) throw new AppError('Invalid ID.', 400);

  if (type === 'folder') {
    const folder = await Folder.findOne({ _id: oid, userId: req.user._id });
    if (!folder) throw new AppError('Folder not found or access denied.', 404);

    // Delete all images from Cloudinary + DB
    const images = await Image.find({ folderId: oid, userId: req.user._id })
      .select('+cloudinaryPublicId')
      .lean();

    await Promise.allSettled(
      images
        .filter((img) => img.cloudinaryPublicId)
        .map((img) => cloudinary.uploader.destroy(img.cloudinaryPublicId))
    );

    await Image.deleteMany({ folderId: oid, userId: req.user._id });
    await Folder.deleteOne({ _id: oid });

    res.status(200).json({ status: 'success', message: 'Folder permanently deleted.' });
  } else if (type === 'image') {
    const image = await Image.findOne({ _id: oid, userId: req.user._id })
      .select('+cloudinaryPublicId');

    if (!image) throw new AppError('Image not found or access denied.', 404);

    // Remove from Cloudinary
    if (image.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (err) {
        console.warn(`[Cloudinary] Could not delete asset ${image.cloudinaryPublicId}:`, err.message);
      }
    }

    await Image.deleteOne({ _id: oid });

    res.status(200).json({ status: 'success', message: 'Image permanently deleted.' });
  } else {
    throw new AppError('Invalid type. Use "folder" or "image".', 400);
  }
});

// ── RECENT ITEMS ──────────────────────────────────────────────────────────

/**
 * GET /api/storage/recent
 * Get recently accessed items (ordered by lastAccessedAt)
 */
const getRecent = asyncHandler(async (req, res) => {
  const [recentFolders, recentImages] = await Promise.all([
    Folder.find({ userId: req.user._id, isDeleted: false, lastAccessedAt: { $ne: null } })
      .sort({ lastAccessedAt: -1 })
      .limit(20)
      .lean(),
    Image.find({ userId: req.user._id, isDeleted: false, lastAccessedAt: { $ne: null } })
      .sort({ lastAccessedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  // Add type field to distinguish folders from images
  const foldersWithType = recentFolders.map((f) => ({ ...f, type: 'folder' }));
  const imagesWithType = recentImages.map((i) => ({ ...i, type: 'image' }));

  // Merge and sort all recent items by lastAccessedAt
  const allRecent = [...foldersWithType, ...imagesWithType]
    .sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt))
    .slice(0, 30);

  res.status(200).json({
    status: 'success',
    items: allRecent,
  });
});

/**
 * GET /api/storage/usage
 * Return total bytes used by the user and quota (bytes)
 */
const getUsage = asyncHandler(async (req, res) => {
  const agg = await Image.aggregate([
    { $match: { userId: req.user._id, isDeleted: false } },
    { $group: { _id: null, total: { $sum: '$size' } } },
  ]);

  const used = (agg[0] && agg[0].total) ? agg[0].total : 0;
  const quota = 15 * 1024 * 1024 * 1024; // 15 GB default quota

  res.status(200).json({ status: 'success', used, quota });
});

/**
 * Middleware to track last accessed time
 * Call this when a folder or image is accessed
 */
const trackAccess = asyncHandler(async (req, res, next) => {
  const { type, id } = req.params;
  const oid = toObjectId(id);

  if (!oid) return next();

  if (type === 'folder') {
    await Folder.updateOne(
      { _id: oid, userId: req.user._id },
      { lastAccessedAt: new Date() }
    );
  } else if (type === 'image') {
    await Image.updateOne(
      { _id: oid, userId: req.user._id },
      { lastAccessedAt: new Date() }
    );
  }

  next();
});

/**
 * Middleware to track folder access time
 * Call this when a folder is accessed
 */
const trackFolderAccess = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const oid = toObjectId(id);

  if (!oid) return next();

  await Folder.updateOne(
    { _id: oid, userId: req.user._id },
    { lastAccessedAt: new Date() }
  );

  next();
});

/**
 * Middleware to track image access time
 * Call this when an image is accessed
 */
const trackImageAccess = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const oid = toObjectId(id);

  if (!oid) return next();

  await Image.updateOne(
    { _id: oid, userId: req.user._id },
    { lastAccessedAt: new Date() }
  );

  next();
});

module.exports = {
  // Starred
  getStarred,
  toggleStar,
  // Trash
  getTrash,
  moveToTrash,
  restoreFromTrash,
  permanentlyDelete,
  // Recent
  getRecent,
  getUsage,
  trackAccess,
  trackFolderAccess,
  trackImageAccess,
};
