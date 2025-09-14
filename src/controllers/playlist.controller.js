import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { application } from "express";
import { User } from "../models/user.models.js";
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

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
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
            $match: {
              isPublished: true,
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
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
        owner: {
          $first: "$owner",
        },
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
    playlist?.owner.toString() !== req.user?._id.toString() ||
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

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
