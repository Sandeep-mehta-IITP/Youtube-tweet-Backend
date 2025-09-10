import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  const fields = { title, description };

  for (const [key, value] of Object.entries(fields)) {
    if (!value?.trim()) {
      throw new apiError(400, `${key} is required.`);
    }
  }

  const videoFileLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  if (!videoFileLocalPath) {
    throw new apiError(400, "videoFile is required.");
  }

  if (!thumbnailLocalPath) {
    throw new apiError(400, "thumbnial is required.");
  }

  if (!req.user?._id) {
    throw new apiError(401, "You must be logged in to publish a video.");
  }

  let videoFile, thumbnail;

  try {
    [videoFile, thumbnail] = await Promise.all([
      uploadOnCloudinary(videoFileLocalPath),
      uploadOnCloudinary(thumbnailLocalPath),
    ]);
  } catch (error) {
    throw new apiError(500, "Failed to file upload, please try again.");
  }

  // const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  // const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new apiError(500, "Failed to uplaod videoFile.");
  }

  if (!thumbnail) {
    throw new apiError(500, "Failed to uplaod thumbnail.");
  }

  const video = await Video.create({
    title,
    description,
    duration: videoFile.duration,
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: true,
  });

  if (!video) {
    // performance ko increase krne ke liye. -> two await query ek sath run hogi.
    await Promise.all([
      deleteFromCloudinary(videoFile.public_id),
      deleteFromCloudinary(thumbnail.public_id),
    ]).catch(() => {});

    throw new apiError(500, "Failed to publish video, please try again.");
  }

  return res
    .status(200)
    .json(new apiResponse(200, video, "Video published successfully."));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
