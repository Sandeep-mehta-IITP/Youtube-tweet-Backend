import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";


//TODO: get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pipeline = [];
  // for using full text based search u need to create a search index in mongoDB atlas
  // you can include field mappings in search index eg title, descriptio, as well
  // field mappings specify which fields within your document should be indexed fro text serach
  // this helps in searching only in title, description providing faster search results
  // here the name of search index is 'serach-video'

  if (query) {
    query = query.trim();
    if (query.length > 0 && process.env.SEARCH_INDEX_VIDEOS) {
      pipeline.push({
        $search: {
          index: process.env.SEARCH_INDEX_VIDEOS,
          text: {
            query: query,
            path: ["title", "description"], // saearch only by title and description
          },
        },
      });
    }
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new apiError(400, "Invalid user ID.");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // fetch videos only that are set isPublsihed ture

  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  // sortBy can be views , createdAt and duration
  // sortBy can be  ascending (1) or descending (-1)

  const validSortFields = ["views", "duration", "createdAt"];

  if (sortBy) {
    if (!validSortFields.includes(sortBy)) {
      throw new apiError(400, `Invalid sortBy field: ${sortBy}`);
    }

    // [sortBy] yeh key value pair bna rha object ke liye views , duration , createdAt
    const sortDirection = (sortType || "desc").toLowerCase() === "asc" ? 1 : -1;

    pipeline.push({
      $sort: {
        [sortBy]: sortDirection,
      },
    });
    sortType = sortDirection === 1 ? "asc" : "desc"; // normalize for response
  } else {
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
    sortBy = "createdAt";
    sortType = "desc";
  }

  // ower deatails fetch krna
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
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
      $unwind: {
        path: "$ownerDetails",
        preserveNullAndEmptyArrays: true, // owner delete ho gya to usko handle krna
      },
    }
  );

  const aggregateVideo = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(aggregateVideo, options);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { ...video, sortInfo: { sortBy, sortType } },
        "Videos fetched successfully."
      )
    );
});



// TODO: get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

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

//TODO: get video by id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

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

//TODO: update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invalid video ID.");
  }

  if (!(title && description)) {
    throw new apiError(400, "Title or description is required.");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "The video can be updated only by owner.");
  }

  const oldThumbnail = video?.thumbnail?.url;

  const thumbnailLocalPath = req.file?.path;

  let thumbnail = null;

  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new apiError(500, "Thumbnail upload failed.");
    }
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        ...(thumbnail && {
          // spread operator -> agr thumbnail h to usko set krega aur nhi h to thumbnail ko ignore kr dega.
          thumbnail: {
            url: thumbnail?.url,
            public_id: thumbnail?.public_id,
          },
        }),
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new apiError(500, "Failed to update video , please try again later.");
  }

  // thumbnail upload hone ke bad old thumbnail ko delete krna
  if (thumbnail && oldThumbnail) {
    try {
      await deleteFromCloudinary(oldThumbnail);
    } catch (err) {
      throw new apiError(500, "Failed to delete old thumbnail:");
    }
  }

  return res
    .status(200)
    .json(new apiResponse(200, updatedVideo, "Video updated successfully. "));
});

//TODO: delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Invlaid video ID.");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "You are not authorized to delete this video.");
  }

  const deletedVideo = await Video.findByIdAndDelete(video?._id);

  if (!deletedVideo) {
    throw new apiError(500, "Failed to delete video, please try again later.");
  }

  await Promise.all([
    deleteFromCloudinary(video?.videoFile?.public_id),
    deleteFromCloudinary(video?.thumbnail?.public_id),
  ]);

  await Like.deleteMany({
    video: video?._id,
  });

  await Comment.deleteMany({
    video: video?._id,
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, { deleted: true }, "Video deleted successfully.")
    );
});

//TODO: toggle publish video
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, "Valid video ID is required.");
  }

  if (!req.user?._id) {
    throw new apiError(401, "You must be logged in to toggle the video.");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "You are not authorized to toggle this video.");
  }

  const toggleVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    { new: true }
  );

  if (!toggleVideo) {
    throw new apiError(
      500,
      "Failed to toggle video publish status, please try again later."
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isPublished: toggleVideo?.isPublished },
        "Toggle publish video successfully completed."
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
