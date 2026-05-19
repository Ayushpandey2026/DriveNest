'use strict';

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Image name is required'],
      trim:      true,
      maxlength: [200, 'Image name must be at most 200 characters'],
    },
    imageUrl: {
      type:     String,
      required: [true, 'Image URL is required'],
    },
    /** Cloudinary public_id — needed to delete the asset from Cloudinary */
    cloudinaryPublicId: {
      type:   String,
      select: false,    // internal field, not exposed in API responses
    },
    /** File size in bytes (from multer / Cloudinary response) */
    size: {
      type:    Number,
      default: 0,
      min:     0,
    },
    folderId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Folder',
      required: [true, 'folderId is required'],
      index:    true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    /** Starred/favorited status */
    isStarred: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    /** Soft delete: image is in trash */
    isDeleted: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    /** When the image was deleted (for trash) */
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
    toJSON: { transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

// Compound index: quickly find all images belonging to a folder of a user
imageSchema.index({ folderId: 1, userId: 1 });

module.exports = mongoose.model('Image', imageSchema);
