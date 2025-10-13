import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";

// const toggleLike = asyncHandler(async (req, res) => {

//   const { toggleLike, commentId, videoId, tweetId } = req.query;

//   if (!req.user?._id) throw new apiError(401, "Unauthorized");

//   // Validate ObjectIds
//   if (
//     (commentId && !isValidObjectId(commentId)) ||
//     (videoId && !isValidObjectId(videoId)) ||
//     (tweetId && !isValidObjectId(tweetId))
//   ) {
//     throw new apiError(400, "Invalid ID.");
//   }

//   // Convert toggleLike to boolean
//   let reqLike;
//   if (toggleLike === "true") reqLike = true;
//   else if (toggleLike === "false") reqLike = false;
//   else throw new apiError(400, "Invalid query string...");

//   // Determine which target is being liked
//   const filter = commentId
//     ? { comment: commentId }
//     : videoId
//       ? { video: videoId }
//       : tweetId
//         ? { tweet: tweetId }
//         : null;

//   if (!filter) throw new apiError(400, "No target specified.");

//   // Check if user already liked/disliked
//   let userLike = await Like.findOne({ ...filter, likedBy: req.user._id });

//   let isLiked = false;
//   let isDisLiked = false;

//   if (userLike) {
//     // Toggle logic
//     if (userLike.isLiked === reqLike) {
//       // Same action, remove the like/dislike
//       await userLike.deleteOne();
//     } else {
//       // Update existing like/dislike
//       userLike.isLiked = reqLike;
//       await userLike.save();
//     }
//   } else {
//     // Create new like/dislike
//     await Like.create({
//       ...filter,
//       likedBy: req.user._id,
//       isLiked: reqLike,
//     });
//   }

//   // Calculate total counts efficiently
//   const totalLikes = await Like.countDocuments({ ...filter, isLiked: true });
//   const totalDisLikes = await Like.countDocuments({
//     ...filter,
//     isLiked: false,
//   });

//   // Determine current user status
//   userLike = await Like.findOne({ ...filter, likedBy: req.user._id });
//   isLiked = userLike?.isLiked || false;
//   isDisLiked = userLike && !userLike.isLiked;

//   return res
//     .status(200)
//     .json(
//       new apiResponse(
//         200,
//         { isLiked, totalLikes, isDisLiked, totalDisLikes },
//         "Like toggled successfully"
//       )
//     );
// });

//TODO: toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { toggleLike } = req.query;

  //console.log("Togglelike in video like controller", toggleLike);

  if (!videoId) throw new apiError(400, "Video ID is required.");
  if (!req.user?._id)
    throw new apiError(401, "You must be logged in to like a video.");

  const video = await Video.findById(videoId);
  if (!video) throw new apiError(404, "Video does not exist.");

  // Convert toggleLike to boolean
  let reqLike;
  if (toggleLike === true || toggleLike === "true") reqLike = true;
  else if (toggleLike === false || toggleLike === "false") reqLike = false;
  else throw new apiError(400, "Invalid toggleLike query value.");

  // Check if user already liked/disliked
  let userLike = await Like.findOne({
    video: video._id,
    likedBy: req.user._id,
  });

  console.log("req like", reqLike);

  console.log("user like", userLike);

  if (userLike) {
    if (userLike.Liked === reqLike) {
      // Same action → remove like/dislike
      await userLike.deleteOne();
      userLike = null;
    } else {
      // Update like/dislike
      userLike.Liked = reqLike;
      await userLike.save();
    }
  } else {
    // Create new like/dislike
    await Like.create({
      video: video._id,
      likedBy: req.user._id,
      Liked: reqLike,
    });
  }

  // Recalculate counts
  const totalLikes = await Like.countDocuments({
    video: video._id,
    Liked: true,
  });
  const totalDisLikes = await Like.countDocuments({
    video: video._id,
    Liked: false,
  });

  // Determine current user status
  userLike = await Like.findOne({ video: video._id, likedBy: req.user._id });
  const isLiked = userLike?.Liked || false;
  const isDisLiked = userLike && !userLike.Liked;

  console.log("isliked ", isLiked);
  console.log("isdisliked", isDisLiked);
  console.log("total likes", totalLikes);
  console.log("total dislikes", totalDisLikes);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isLiked, totalLikes, isDisLiked, totalDisLikes },
        "Video like/dislike updated successfully"
      )
    );
});

//TODO: toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { toggleLike } = req.query;

  if (!commentId) throw new apiError(400, "Comment ID is required.");
  if (!req.user?._id)
    throw new apiError(401, "You must be logged in to like a comment.");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new apiError(404, "Comment does not exist.");

  // Convert toggleLike to boolean
  let reqLike;
  if (toggleLike === true || toggleLike === "true") reqLike = true;
  else if (toggleLike === false || toggleLike === "false") reqLike = false;
  else throw new apiError(400, "Invalid toggleLike query value.");

  // Check if user already liked/disliked
  let userLike = await Like.findOne({
    comment: comment._id,
    likedBy: req.user._id,
  });

  if (userLike) {
    if (userLike.Liked === reqLike) {
      // Same action → remove like/dislike
      await userLike.deleteOne();
      userLike = null;
    } else {
      // Update like/dislike
      userLike.Liked = reqLike;
      await userLike.save();
    }
  } else {
    // Create new like/dislike
    await Like.create({
      comment: comment._id,
      likedBy: req.user._id,
      Liked: reqLike,
    });
  }

  // Recalculate counts
  const totalLikes = await Like.countDocuments({
    comment: comment._id,
    Liked: true,
  });
  const totalDisLikes = await Like.countDocuments({
    comment: comment._id,
    Liked: false,
  });

  // Determine current user status
  userLike = await Like.findOne({
    comment: comment._id,
    likedBy: req.user._id,
  });
  const isLiked = userLike?.Liked || false;
  const isDisLiked = userLike && !userLike.Liked;

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isLiked, totalLikes, isDisLiked, totalDisLikes },
        "Comment like/dislike updated successfully"
      )
    );
});

//TODO: toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { toggleLike } = req.query;

  if (!tweetId) throw new apiError(400, "Tweet ID is required.");
  if (!req.user?._id)
    throw new apiError(401, "You must be logged in to like a tweet.");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new apiError(404, "Tweet does not exist.");

  // Convert toggleLike to boolean
  let reqLike;
  if (toggleLike === true || toggleLike === "true") reqLike = true;
  else if (toggleLike === false || toggleLike === "false") reqLike = false;
  else throw new apiError(400, "Invalid toggleLike query value.");

  // Check if user already liked/disliked
  let userLike = await Like.findOne({
    tweet: tweet._id,
    likedBy: req.user._id,
  });

  if (userLike) {
    if (userLike.Liked === reqLike) {
      // Same action → remove like/dislike
      await userLike.deleteOne();
      userLike = null;
    } else {
      // Update like/dislike
      userLike.Liked = reqLike;
      await userLike.save();
    }
  } else {
    // Create new like/dislike
    await Like.create({
      tweet: tweet._id,
      likedBy: req.user._id,
      Liked: reqLike,
    });
  }

  // Recalculate counts
  const totalLikes = await Like.countDocuments({
    tweet: tweet._id,
    Liked: true,
  });
  const totalDisLikes = await Like.countDocuments({
    tweet: tweet._id,
    Liked: false,
  });

  // Determine current user status
  userLike = await Like.findOne({ tweet: tweet._id, likedBy: req.user._id });
  const isLiked = userLike?.Liked || false;
  const isDisLiked = userLike && !userLike.Liked;

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isLiked, totalLikes, isDisLiked, totalDisLikes },
        "Tweet like/dislike updated successfully"
      )
    );
});

//TODO: get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
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
          { $match: { isPublished: true } },
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
          Liked: true,
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
