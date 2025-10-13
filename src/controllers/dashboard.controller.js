import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!isValidObjectId(userId)) {
    throw new apiError(400, "Invalid user ID.");
  }

  // totalsubsribers -> channel id se
  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        subscribersCount: {
          $sum: 1,
        },
      },
    },
  ]);

  // total videos , total likes -> like se , total views -> video ke view field se
  const totalVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
    {
      $project: {
        totalLikes: {
          $size: "$likes",
        },
        totalViews: "$views",
        totalVideos: 1,
      },
    },
    // sabhi ko ek document bnane ke liye
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: "$totalLikes",
        },
        totalViews: {
          $sum: "$totalViews",
        },
        totalVideos: {
          $sum: 1,
        },
      },
    },
  ]);

  // channel stats for response
  const channelStats = {
    totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
    totalLikes: totalVideos[0]?.totalLikes || 0,
    totalViews: totalVideos[0]?.totalViews || 0,
    totalVideos: totalVideos[0]?.totalVideos || 0,
  };

  return res
    .status(200)
    .json(
      new apiResponse(200, channelStats, "Channel stats fetched successfully.")
    );
});

// TODO: Get all the videos uploaded by the channel
const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!isValidObjectId(userId)) {
    throw new apiError(400, "Invalid user ID.");
  }

  const channelVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    // lookup for likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
        pipeline: [
          {
            $match: {
              Liked: true,
            },
          },
        ],
      },
    },
    // lookup for dislikes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "dislikes",
        pipeline: [
          {
            $match: {
              Liked: false,
            },
          },
        ],
      },
    },
    // lookup for comments
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $addFields: {
        createdAtParts: {
          $dateToParts: {
            date: "$createdAt",
          },
        },
        likesCount: {
          $size: "$likes",
        },
        dislikesCount: {
          $size: "$dislikes"
        },
        commentsCount: {
          $size: "$comments"
        }
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        likesCount: 1,
        dislikesCount: 1,
        commentsCount: 1,
        isPublished: 1,
        formattedDate: {
          date: "$createdAtParts.day",
          month: "$createdAtParts.month",
          year: "$createdAtParts.year",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelVideos,
        "Channel videos fetched successfully."
      )
    );
});

export { getChannelStats, getChannelVideos };
