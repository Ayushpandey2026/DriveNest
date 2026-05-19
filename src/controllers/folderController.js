'use strict';

const mongoose                            = require('mongoose');
const Folder                              = require('../models/Folder');
const Image                               = require('../models/Image');
const { AppError, asyncHandler }          = require('../utils/AppError');
const { calcFolderSize,
        getDescendantFolderIds }          = require('../utils/folderUtils');
const { cloudinary }                      = require('../config/cloudinary');

// ── Helpers ───────────────────────────────────────────────────────────────

function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

// ── POST /api/folders ─────────────────────────────────────────────────────

const createFolder = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;

  if (!name?.trim()) {
    throw new AppError('Folder name is required.', 400);
  }

  // Validate parentId belongs to this user (prevents folder-hijacking)
  let parentFolderId = null;
  if (parentId) {
    const oid = toObjectId(parentId);
    if (!oid) throw new AppError('Invalid parentId.', 400);

    const parent = await Folder.findOne({ _id: oid, userId: req.user._id });
    if (!parent) throw new AppError('Parent folder not found or access denied.', 404);
    parentFolderId = oid;
  }

  const folder = await Folder.create({
    name: name.trim(),
    userId: req.user._id,
    parentFolderId,
  });

  res.status(201).json({ status: 'success', folder });
});

// ── GET /api/folders ──────────────────────────────────────────────────────
// Query param: ?parentId=<id>   (omit for root folders)

const getFolders = asyncHandler(async (req, res) => {
  const { parentId } = req.query;

  const filter = {
    userId: req.user._id,
    parentFolderId: parentId ? toObjectId(parentId) : null,
    isDeleted: false,  // Exclude deleted folders
  };

  if (parentId && !filter.parentFolderId) {
    throw new AppError('Invalid parentId.', 400);
  }

  const folders = await Folder.find(filter).sort({ createdAt: -1 }).lean();

  // Attach recursive sizes in parallel
  const foldersWithSize = await Promise.all(
    folders.map(async (f) => ({
      ...f,
      totalSize:  await calcFolderSize(f._id, req.user._id),
      itemCount:  await countFolderItems(f._id, req.user._id),
    }))
  );

  res.status(200).json({ status: 'success', folders: foldersWithSize });
});

// ── GET /api/folders/:id ──────────────────────────────────────────────────

const getFolderById = asyncHandler(async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) throw new AppError('Invalid folder ID.', 400);

  const folder = await Folder.findOne({ _id: oid, userId: req.user._id, isDeleted: false }).lean();
  if (!folder) throw new AppError('Folder not found or access denied.', 404);

  // Update lastAccessedAt
  await Folder.updateOne({ _id: oid }, { lastAccessedAt: new Date() });

  // Sub-folders with sizes (excluding deleted)
  const rawSubFolders = await Folder.find({
    parentFolderId: oid,
    userId: req.user._id,
    isDeleted: false,
  }).sort({ createdAt: -1 }).lean();

  const subFolders = await Promise.all(
    rawSubFolders.map(async (f) => ({
      ...f,
      totalSize: await calcFolderSize(f._id, req.user._id),
      itemCount: await countFolderItems(f._id, req.user._id),
    }))
  );

  // Images directly inside this folder (excluding deleted)
  const images = await Image.find({ folderId: oid, userId: req.user._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  const totalSize = await calcFolderSize(oid, req.user._id);

  res.status(200).json({
    status: 'success',
    folder: { ...folder, totalSize },
    subFolders,
    images,
  });
});

// ── PATCH /api/folders/:id ────────────────────────────────────────────────

const renameFolder = asyncHandler(async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) throw new AppError('Invalid folder ID.', 400);

  const { name } = req.body;
  if (!name?.trim()) throw new AppError('New folder name is required.', 400);

  const folder = await Folder.findOneAndUpdate(
    { _id: oid, userId: req.user._id },
    { name: name.trim() },
    { new: true, runValidators: true }
  );
  if (!folder) throw new AppError('Folder not found or access denied.', 404);

  res.status(200).json({ status: 'success', folder });
});

// ── DELETE /api/folders/:id ───────────────────────────────────────────────

const deleteFolder = asyncHandler(async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) throw new AppError('Invalid folder ID.', 400);

  const folder = await Folder.findOne({ _id: oid, userId: req.user._id });
  if (!folder) throw new AppError('Folder not found or access denied.', 404);

  // Collect all descendant folder IDs (BFS)
  const descendantIds = await getDescendantFolderIds(oid, req.user._id);
  const allFolderIds  = [oid.toString(), ...descendantIds];

  // Delete all images from Cloudinary + DB across all folders
  const images = await Image.find({
    folderId: { $in: allFolderIds },
    userId: req.user._id,
  }).select('+cloudinaryPublicId').lean();

  await Promise.allSettled(
    images
      .filter((img) => img.cloudinaryPublicId)
      .map((img) => cloudinary.uploader.destroy(img.cloudinaryPublicId))
  );

  await Image.deleteMany({ folderId: { $in: allFolderIds }, userId: req.user._id });
  await Folder.deleteMany({ _id: { $in: allFolderIds }, userId: req.user._id });

  res.status(200).json({ status: 'success', message: 'Folder and all its contents deleted.' });
});

// ── Internal helper ───────────────────────────────────────────────────────

async function countFolderItems(folderId, userId) {
  const [subCount, imgCount] = await Promise.all([
    Folder.countDocuments({ parentFolderId: folderId, userId }),
    Image.countDocuments({ folderId, userId }),
  ]);
  return subCount + imgCount;
}

module.exports = { createFolder, getFolders, getFolderById, renameFolder, deleteFolder };
