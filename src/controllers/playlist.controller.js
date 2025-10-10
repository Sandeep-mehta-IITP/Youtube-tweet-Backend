import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

//TODO: create playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name?.trim() || !description?.trim()) {
    throw new apiError(400, "Both name and description are required.");
  }

  if (!req.user || !req.user?._id) {
    throw new apiError(401, "Unauthorized. Please login to create a playlist.");
  }

  if (name.length < 3 || name.length > 150) {
    throw new apiError(
      400,
      "Playlist name must be between 3 and 150 characters."
    );
  }

  if (description.length < 3 || description.length > 500) {
    throw new apiError(
      400,
      "Playlist description must be between 3 and 500 characters."
    );
  }
  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new apiError(
      500,
      "Failed to create playlist, please try again later."
    );
  }

  return res
    .status(201)
    .json(new apiResponse(201, playlist, "Playlist created successfully."));
});

//TODO: get user playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new apiError(400, "Invalid user ID.");
  }

   // THINKME : playlist thumbnail

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              views: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
        thumbnail: {
          $first: "$videos.thumbnail",
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        thumbnail: 1,
        totalVideos: 1,
        totalViews: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(200, playlists, "User playlists fetched successfully.")
    );
});

//TODO: get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new apiError(400, "Invalid playlist ID.");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new apiError(404, "Playlist does not exist.");
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $match: { isPublished: true },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              description: 1,
              views: 1,
              thumbnail: 1,
              videoFile: 1,
              duration: 1,
              createdAt: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        totalVideos: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
        thumbnail: { $first: "$videos.thumbnail" },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        owner: 1,
        videos: 1,
        totalVideos: 1,
        totalViews: 1,
        thumbnail: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, playlists, "Playlists fetched successfully."));
});

// TODO: add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new apiError(400, "Valid playlist ID and video ID are required.");
  }

  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);

  if (!playlist) {
    throw new apiError(404, "Playlist not found.");
  }

  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  if (
    playlist?.owner.toString() !== req.user?._id.toString() &&
    video?.owner.toString() !== req.user?._id.toString()
  ) {
    throw new apiError(
      401,
      "Unauthorized: Video can be added only by playlist owner."
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new apiError(
      500,
      "Failed to add video to playlsit, please try again later."
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        updatedPlaylist,
        "Update Playlsit: Video add successfully."
      )
    );
});

// TODO: remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new apiError(400, "Valid playlist ID and video ID are required.");
  }

  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);

  if (!playlist) {
    throw new apiError(404, "Playlist not found.");
  }

  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  if (
    playlist.owner.toString() !== req.user?._id.toString() &&
    video.owner.toString() !== req.user?._id.toString()
  ) {
    throw new apiError(
      401,
      "Unauthorized: Video can be removed only by owner from playlist."
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,

    // remove video from playlist
    {
      $pull: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new apiError(
      500,
      "Failed to remove video from playlist, please try again later."
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        updatedPlaylist,
        "Update playlist: Video removed successfully."
      )
    );
});

// TODO: delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new apiError(400, "Invalid playlist ID.");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new apiError(404, "Playlist not found.");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(
      401,
      "Unauthorized: Playlist can be deleted only by owner."
    );
  }

  await Playlist.findByIdAndDelete(playlist?._id);

  return res
    .status(200)
    .json(
      new apiResponse(200, { delete: true }, "Playlist deleted successfully.")
    );
});

//TODO: update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new apiError(400, "Invalid playlist ID.");
  }

  if (!name && !description) {
    throw new apiError(
      400,
      "At least one field (name or description) is required."
    );
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new apiError(404, "Playlist not found.");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(
      401,
      "Unauthorized: Playlist can be updated only by owner."
    );
  }

  const updateFields = {};
  if (name) {
    updateFields.name = name;
  }

  if (description) {
    updateFields.description = description;
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
      $set: updateFields,
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new apiError(
      500,
      "Failed to update playlist, please try again later."
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedPlaylist, "Playlist updated successfully.")
    );
});

//TODO: saved playlists
const getVideoSavePlaylists = asyncHandler(async(req, res) => {
  const {videoId} = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video Id.")
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      }
    },
    {
      $project: {
        name: 1,
        isVideoPresent: {
          $cond: {
            if: { $in: [new mongoose.Types.ObjectId(videoId), "$videos"]},
            then: true,
            else: false,
          }
        }
      }
    }
  ])

  return res.status(200).json(
    new apiResponse(200, playlists, "Playlists sent successfully!!!")
  )
})


export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
  getVideoSavePlaylists,
};
