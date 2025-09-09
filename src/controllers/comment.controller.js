import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video

  // get content, videoID from frontend
  //  validation -> content videoID
  // user login or not to post comment
  // find video
  // create comment
  // check comment is created or not
  // return res

  const { content } = req.body;
  const { videoId } = req.params;

  if (!content) {
    throw new apiError(400, "Comment content is required..");
  }

  if (!videoId || !isValidObjectId(videoId)) {
    throw new apiError(400, "Valid video Id is required.");
  }

  if (!req.user?._id) {
    throw new apiError(401, "You must be logged in to post a comment.");
  }

  const video = await Video.findById(videoId).select(" _id title");
  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new apiError(400, "Failed to create comment, Please try again.");
  }

  const newComment = await Comment.findById(comment?._id).populate(
    "owner",
    "username fullName avatar"
  );

  return res
    .status(201)
    .json(new apiResponse(201, newComment, "Commet created successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new apiError(400, "Content is required.");
  }

  if (!commentId || !isValidObjectId(commentId)) {
    throw new apiError(400, "Valid comment Id is required.");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new apiError(404, "Comment does not exist.");
  }

  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "Comment can be updated only by comment owner.");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    comment?._id,
    {
      $set: {
        content: content.trim(),
      },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedComment, "Comment updated successfully.")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment

  const { commentId } = req.params;

  if (!commentId || !isValidObjectId(commentId)) {
    throw new apiError(400, "Valid comment id is required.");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new apiError(404, "Comnet does not exist.");
  }

  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "Comment can be deleted only by comment owner.");
  }

  await Comment.findByIdAndDelete(commentId);

  await Like.deleteMany({
    comment: commentId,
    likedBy: req.user._id,
  });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Comment deleted successfully."));
});

export { getVideoComments, addComment, updateComment, deleteComment };
