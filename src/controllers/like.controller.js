import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!videoId) {
    throw new apiError(400, "Video Id is required.");
  }

  if (!req.user?._id) {
    throw new apiError(401, "You must be logged in to like a video.");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new apiError(404, "Video does not exist.");
  }

  const likedAlready = await Like.findOne({
    video: video._id,
    likedBy: req.user?._id,
  }).lean();

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: false }, "Video unliked Successfully.")
      );
  }

  await Like.create({
    video: video._id,
    likedBy: req.user?._id,
  });

  return res
    .status(200)
    .json(new apiResponse(200, { isLiked: true }, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!commentId) {
    throw new apiError(400, "Comment ID is required.");
  }

  if (!req.user?._id) {
    throw new apiError(401, "You must be logged in to like a comment.");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new apiError(404, "Comment does not exist.");
  }

  const likedAlready = await Like.findOne({
    comment: comment._id,
    likedBy: req.user?._id,
  }).lean();

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready._id);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { isLiked: false },
          "Comment unliked successfully."
        )
      );
  }

  await Like.create({
    comment: comment._id,
    likedBy: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, { isLiked: true }, "Comment liked successfully.")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!tweetId) {
    throw new apiError(400, "Tweet ID is required.");
  }

  if (!req.user?._id) {
    throw new apiError(401, "You must be logged in to like a tweet.");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new apiError(404, "Tweet does not exist.");
  }

  const likedAlready = await Like.findOne({
    tweet: tweet._id,
    likedBy: req.user?._id,
  }).lean();

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: false }, "Tweet unliked successfully.")
      );
  }

  await Like.create({
    tweet: tweet._id,
    likedBy: req.user?._id,
  });

  return res
    .status(200)
    .json(new apiResponse(200, { isLiked: true }, "Tweet liked successfully."));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  if (!req.user?._id) {
    throw new apiError(
      401,
      "You must have to logged in to watch liked videos."
    );
  }

  const userLikedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    // join with videos collection to get video details
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          // join with users collection to get owner details
          // yeh pipeline har ek liked video pe chalega
          // aur har ek video ke sath uske owner ki details bhi le aayega
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
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$ownerDetails",
              preserveNullAndEmptyArrays: true, // safety: agar owner delete ho jaye
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$likedVideos",
        preserveNullAndEmptyArrays: false, //agar video delete ho gaya to skip karega
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: "$likedVideos._id",
          videoFile: "$likedVideos.videoFile",
          thumbnail: "$likedVideos.thumbnail",
          title: "$likedVideos.title",
          description: "$likedVideos.description",
          duration: "$likedVideos.duration",
          views: "$likedVideos.views",
          isPublished: "$likedVideos.isPublished",
          owner: "$likedVideos.ownerDetails",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        userLikedVideos,
        "User liked videos fetched successfully."
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
