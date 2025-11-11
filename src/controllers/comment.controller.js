import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";

//TODO: get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new apiError(400, "Valid video ID is required.");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, "Video not found.");
  }

  const videoAllComments = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    // comment owner
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
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
    // fetch likes on comment
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
        pipeline: [
          {
            $match: {
              Liked: true,
            },
          },
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "dislikes",
        pipeline: [
          {
            $match: {
              Liked: false,
            },
          },
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    // reshape likes or dislikes
    {
      $addFields: {
        totalLikes: {
          $size: "$likes",
        },
        totalDisLikes: {
          $size: "$dislikes",
        },
        isOwner: {
          $cond: {
            if: { $eq: [req.user?._id, "$owner._id"] },
            then: true,
            else: false,
          },
        },
        isLiked: req.user?._id
          ? {
              $cond: {
                if: {
                  $in: [new mongoose.Types.ObjectId(req.user?._id), "$likes.likedBy"],
                },
                then: true,
                else: false,
              },
            }
          : false,
        isDisLiked: req.user?._id
          ? {
              $cond: {
                if: {
                  $in: [new mongoose.Types.ObjectId(req.user?._id), "$dislikes.likedBy"],
                },
                then: true,
                else: false,
              },
            }
          : false,
        isLikedByVideoOwner: {
          $cond: {
            if: {
              $in: [video.owner, "$likes"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        totalLikes: 1,
        totalDisLikes: 1,
        isLiked: 1,
        isDisLiked: 1,
        isOwner: 1,
        isLikedByVideoOwner: 1,
        owner: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(videoAllComments, options);

  //console.log("comments", comments);
  
  return res
    .status(200)
    .json(
      new apiResponse(200, comments, "Video comments fetched successfully.")
    );
});

// TODO: add a comment to a video
const addComment = asyncHandler(async (req, res) => {
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
  ).lean();

  const commentData = {
    ...newComment,
    likesCount: 0,
    isOwner: newComment?.owner?._id?.toString() === req.user?._id?.toString(),
    isLiked: false,
    isDisLiked: false,
    isLikedByVideoOwner: video.owner?.toString() === req.user?._id?.toString(),
  };

  return res
    .status(201)
    .json(new apiResponse(201, commentData, "Commet created successfully."));
});

// TODO: update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  //console.log("content", content);
  

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

// TODO: delete a comment
const deleteComment = asyncHandler(async (req, res) => {
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
    comment: new mongoose.Types.ObjectId(commentId),
    likedBy: req.user._id,
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, { isDeleted: true }, "Comment deleted successfully.")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
