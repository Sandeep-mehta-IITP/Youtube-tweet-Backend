import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

  return res
    .status(200)
    .json(new apiResponse(200, tweet, "Tweet created successfully."));
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likesDetails",
        pipeline: [
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likesDetails",
        },
        ownerDetails: {
          $first: "$ownerDetails",
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
      },
    },
    {
      $sort: {
        createdAt: -1, // sort by createdAt in descending order -> latest tweet first.
      },
    },
    {
      $project: {
        content: 1,
        ownerDetails: 1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
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

export { createTweet, getUserTweets, updateTweet, deleteTweet };
