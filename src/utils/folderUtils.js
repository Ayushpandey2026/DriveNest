'use strict';

const Folder = require('../models/Folder');
const Image  = require('../models/Image');

/**
 * Recursively compute the total byte-size of all images within a folder
 * (including all nested sub-folders at any depth).
 *
 * Uses an iterative BFS instead of recursion to avoid deep call stacks.
 *
 * @param {string|ObjectId} folderId  Root folder to start from
 * @param {string|ObjectId} userId    Owner – used as a safety filter
 * @returns {Promise<number>}         Total size in bytes
 */
async function calcFolderSize(folderId, userId) {
  let totalSize = 0;
  const queue   = [folderId.toString()];

  while (queue.length > 0) {
    const currentId = queue.shift();

    // Sum sizes of all images directly inside this folder
    const [sizeResult] = await Image.aggregate([
      { $match: { folderId: require('mongoose').Types.ObjectId.createFromHexString(currentId), userId: require('mongoose').Types.ObjectId.createFromHexString(userId.toString()) } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    totalSize += sizeResult?.total ?? 0;

    // Enqueue all immediate sub-folders
    const subFolders = await Folder.find({ parentFolderId: currentId, userId }).select('_id').lean();
    subFolders.forEach((f) => queue.push(f._id.toString()));
  }

  return totalSize;
}

/**
 * Recursively collect all descendant folder IDs of a given folder.
 * Useful for cascade deletes.
 *
 * @param {string|ObjectId} folderId
 * @param {string|ObjectId} userId
 * @returns {Promise<string[]>}  Array of folder ID strings (NOT including folderId itself)
 */
async function getDescendantFolderIds(folderId, userId) {
  const ids   = [];
  const queue = [folderId.toString()];

  while (queue.length > 0) {
    const currentId  = queue.shift();
    const subFolders = await Folder.find({ parentFolderId: currentId, userId }).select('_id').lean();
    subFolders.forEach((f) => {
      ids.push(f._id.toString());
      queue.push(f._id.toString());
    });
  }

  return ids;
}

module.exports = { calcFolderSize, getDescendantFolderIds };
