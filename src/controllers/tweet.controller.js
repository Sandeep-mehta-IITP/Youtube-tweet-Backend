import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.models.js";
import { Subscription } from "../models/subscription.models.js";

//TODO: create tweet
const createTweet = asyncHandler(async (req, res) => {
  // get content from fronted
  // check if content is provided
  // get owner of the tweet
  // valid owner is available or not
  // create tweet
  // check if tweet is created or not
  // return success response with tweet data
  const { content } = req.body;

  if (!content) {
    throw new apiError(400, "Content is required to create a tweet.");
  }

  const owner = await User.findById(req.user?._id).select(
    "username avatar fullName createdAt"
  );

  if (!owner) {
    throw new apiError(404, "Tweet owner does not exist.");
  }

  const tweet = await Tweet.create({
    content,
    owner: owner._id,
  });

  if (!tweet) {
    throw new apiError(500, "Failed to create tweet.");
  }

  await tweet.populate("owner", "username fullName avatar createdAt");

  const tweetData = {
    ...tweet._doc,
    owner: {
      fullName: owner.fullName,
      username: owner.username,
      avatar: owner.avatar,
    },
    totalLikes: 0,
    totalDislikes: 0,
    isLiked: false,
    isDisLiked: false,
  };

  return res
    .status(200)
    .json(new apiResponse(200, tweetData, "Tweet created successfully."));
});

//TODO: update tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!content) {
    throw new apiError(400, "Content is required to update a tweet.");
  }

  if (!isValidObjectId(tweetId)) {
    throw new apiError(400, "Invalid tweet ID.");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new apiError(404, "Tweet not found.");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "You are not authorized to update this tweet.");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedTweet) {
    throw new apiError(500, "Failed to update tweet.");
  }

  return res
    .status(200)
    .json(new apiResponse(200, updatedTweet, "Tweet updated successfully."));
});

//TODO: delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new apiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new apiError(404, "Tweet does not exist.");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new apiError(403, "You are not authorized to delete this tweet.");
  }

  await Tweet.findByIdAndDelete(tweetId);

  await Like.deleteMany({
    tweet: new mongoose.Types.ObjectId(tweetId),
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, { deleted: true }, "Tweet deleted successfully.")
    );
});

// TODO: get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new apiError(400, "UserId is missing.");
  }

  if (!isValidObjectId(userId)) {
    throw new apiError(400, "Invalid userId.");
  }

  const tweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    // Owner details
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
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    // Likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likesDetails",
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

    // Dislikes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "dislikesDetails",
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

    // Add fields
    {
      $addFields: {
        likesCount: {
          $size: "$likesDetails",
        },
        dislikesCount: {
          $size: "$dislikesDetails",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user?._id),
                "$likesDetails.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
        isDisLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user?._id),
                "$dislikesDetails.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },

    // Sort latest first
    {
      $sort: {
        createdAt: -1,
      },
    },
    // Project only needed fields
    {
      $project: {
        content: 1,
        ownerDetails: 1,
        likesCount: 1,
        dislikesCount: 1,
        createdAt: 1,
        isLiked: 1,
        isDisLiked: 1,
      },
    },
  ]);

  if (!tweet?.length) {
    throw new apiError(404, "No tweets found for this user.");
  }

  return res
    .status(200)
    .json(new apiResponse(200, tweet, "User tweets fetched successfully.")); // returning all tweets for the user isliye hum tweet likh rhe h na ki tweet[0]
});

//TODO: get all tweets
const getAllTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const allTweets = Tweet.aggregate([
    {
      $sort: {
        createdAt: -1,
      },
    },
    // fetch likes of tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
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
    // fetch dislikes of tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
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
    // get owner details
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
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    // reshape likes and dislikes
    {
      $addFields: {
        totalLikes: {
          $size: "$likes",
        },
        totalDislikes: {
          $size: "$dislikes",
        },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(req.user?._id), "$likes.likedBy"],
        },
        isDisLiked: {
          $in: [
            new mongoose.Types.ObjectId(req.user?._id),
            "$dislikes.likedBy",
          ],
        },
        isOwner: {
          $cond: {
            if: {
              $eq: ["$owner._id", new mongoose.Types.ObjectId(req.user?._id)],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updateAt: 1,
        owner: 1,
        isOwner: 1,
        totalLikes: 1,
        totalDislikes: 1,
        isLiked: 1,
        isDisLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const response = await Tweet.aggregatePaginate(allTweets, options);

  return res
    .status(200)
    .json(new apiResponse(200, response, "All tweets fetched successfully..."));
});

//TODO: all users feed tweets
const getAllUsersFeedTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const subscriptions = await Subscription.find({ subscriber: req.user?._id });
  const subscribedChannels = subscriptions.map((item) => item.channel);

  const allTweets = Tweet.aggregate([
    {
      $match: {
        owner: {
          $in: subscribedChannels,
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    // fetch likes of tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
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
    // fetch dislikes of tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
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
    // get owner details
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
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    // reshape likes and dislikes
    {
      $addFields: {
        totalLikes: {
          $size: "$likes",
        },
        totalDislikes: {
          $size: "$dislikes",
        },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(req.user?._id), "$likes.likedBy"],
        },
        isDisLiked: {
          $in: [
            new mongoose.Types.ObjectId(req.user?._id),
            "$dislikes.likedBy",
          ],
        },
        isOwner: {
          $cond: {
            if: {
              $eq: ["$owner._id", new mongoose.Types.ObjectId(req.user?._id)],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updateAt: 1,
        owner: 1,
        isOwner: 1,
        totalLikes: 1,
        totalDislikes: 1,
        isLiked: 1,
        isDisLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const response = await Tweet.aggregatePaginate(allTweets, options);

  return res
    .status(200)
    .json(new apiResponse(200, response, "All users feed tweets fetched successfully..."));
});

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
  getAllTweets,
  getAllUsersFeedTweets,
};
