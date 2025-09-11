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
import { videoQueue } from "../queues/video.queue.js";

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

  //console.log("videoFileLocalPath:", videoFileLocalPath);
  //console.log("thumbnailLocalPath:", thumbnailLocalPath);

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

  // const video = await Video.create({
  //   title,
  //   description,
  //   owner: req.user?._id,
  //   status: "processing",
  // });

  // //console.log("adding to queue");
  // await videoQueue.add("processVideo", {
  //   videoId: video._id,
  //   videoFileLocalPath,
  //   thumbnailLocalPath,
  // });

  return res
    .status(200)
    .json(new apiResponse(200, video, "Video upload successfully."));
});

// export const getVideoStatus = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;

//   const video = await Video.findById(videoId);

//   if (!video) throw new apiError(404, "Video not found");

//   return res.status(200).json({
//     statusCode: 200,
//     success: true,
//     data: {
//       videoId: video._id,
//       status: video.status, // processing | processed | failed
//       videoFile: video.videoFile, // jab processed ho jaaye to milega
//       thumbnail: video.thumbnail,
//       duration: video.duration,
//     },
//     message: "Video status fetched successfully",
//   });
// });

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video ID.");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new apiError(400, "Invalid user ID.");
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const videoObjectId = new mongoose.Types.ObjectId(videoId);

  const video = await Video.aggregate([
    {
      $match: {
        _id: videoObjectId,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    // video owner deatils
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [userId, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    // comments deatials with comment owner
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
        pipeline: [
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
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$owner",
          },
          {
            $project: {
              content: 1,
              owner: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [userId, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video.length) {
    throw new apiError(404, "Video not found.");
  }

  //  Update views + watchHistory in parallel
  await Promise.all([
    Video.updateOne({ _id: videoObjectId }, { $inc: { views: 1 } }),
    User.updateOne(
      { _id: userId },
      { $addToSet: { watchHistory: videoObjectId } }
    ),
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, video[0], "Video fetched successfully."));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!isValidObjectId(videoId)) {
    throw
  }
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
