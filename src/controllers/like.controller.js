import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";

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
    video: videoId,
    likedBy: req.user?._id,
  }).lean();

  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
      .status(200)
      .json(new apiResponse(200, { isLiked: false }, "Video disliked Successfully."));
  }

  await Like.create({
    video: videoId,
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
          "Comment disliked successfully."
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
      new apiResponse(
        200, 
        { isLiked: true }, 
        "Comment liked successfully."
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
