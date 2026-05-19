'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Folder name is required'],
      trim:      true,
      minlength: [1, 'Folder name cannot be empty'],
      maxlength: [200, 'Folder name must be at most 200 characters'],
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    parentFolderId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Folder',
      default: null,   // null = root level
      index:   true,
    },
    /** Starred/favorited status */
    isStarred: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    /** Soft delete: folder is in trash */
    isDeleted: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    /** When the folder was deleted (for trash) */
    deletedAt: {
      type:    Date,
      default: null,
    },
    /** Track last accessed time for "Recent" feature */
    lastAccessedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

// ── Compound index: user + parent lookup (used in GET /folders) ────────────
folderSchema.index({ userId: 1, parentFolderId: 1 });

// ── Cascade delete: remove all sub-folders and images when a folder is deleted
folderSchema.pre('findOneAndDelete', async function (next) {
  const folder = await this.model.findOne(this.getFilter());
  if (!folder) return next();

  const Image  = mongoose.model('Image');
  const Folder = mongoose.model('Folder');

  // Recursive cascade handled by the controller utility; here we only clean
  // direct children in case the controller skips this hook path.
  // Full recursive deletion lives in folderController.deleteFolder().
  await Image.deleteMany({ folderId: folder._id });
  next();
});

module.exports = mongoose.model('Folder', folderSchema);
