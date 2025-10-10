import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// TODO: toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // subscriber -> req.user._id
  // validate channelId -> valid objectId and chanel exists
  // validated channelID should not be same as subscriber id
  //check if subscription already exists
  // if exists -> unsubscribe (delete)
  // if not exists -> subscribe (create)
  // return response

  const subscriberId = req.user?._id;
  if (!subscriberId) {
    throw new apiError(401, "You must be logged in to subscribe to a channel.");
  }

  if (!isValidObjectId(channelId)) {
    throw new apiError(400, "Invalid channelId .");
  }

  const chanelExists =
    await User.findById(channelId).select("_id fullName email");
  if (!chanelExists) {
    throw new apiError(404, "Channel does not exist.");
  }

  if (subscriberId.toString() === channelId.toString()) {
    throw new apiError(400, "You cannot subscribe to your own channel.");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  let subscribed;
  if (existingSubscription) {
    // unsubscribe
    await existingSubscription.deleteOne();
    subscribed = false;
  } else {
    // subscribe
    await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });
    subscribed = true;
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { subscribed },
        subscribed ? "Subscribed successfully" : "Unsubscribed successfully"
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(channelId)) {
    throw new apiError(400, "Invalid channel ID.");
  }

  // check if channel exists
  const channelExists = await User.findById(channelId).select("_id fullName");
  if (!channelExists) {
    throw new apiError(404, "Channel does not exist.");
  }

  const result = Subscription.aggregate([
    // Step 1: Match all subscriptions for this channel
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    // Step 2: Lookup subscriber details from Users collection
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          // Lookup: find how many people subscribed to this subscriber
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribedToSubscriber",
            },
          },
          // Add subscriber stats
          {
            $addFields: {
              subscribedToSubscriber: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(channelId),
                      "$subscribedToSubscriber.subscriber",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              totalSubscribers: {
                $size: "$subscribedToSubscriber",
              },
            },
          },
        ],
      },
    },
    // Step 3: Unwind subscriber array (clean data)
    {
      $unwind: "$subscriber",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    // Step 4: Project clean fields for output
    {
      $project: {
        _id: "$subscriber._id",
        fullName: "$subscriber.fullName",
        username: "$subscriber.username",
        avatar: "$subscriber.avatar",
        subscribedToSubscriber: "$subscriber.subscribedToSubscriber",
        totalSubscribers: "$subscriber.totalSubscribers",
      },
    },
  ]);

  // const totalSubscribers = await Subscription.countDocuments({
  //   channel: channelId,
  // });

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const response = await Subscription.aggregatePaginate(result, options);

  return res
    .status(200)
    .json(new apiResponse(200, response, "Subscribers fetched successfully."));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(subscriberId)) {
    throw new apiError(400, "Invalid subscriber ID.");
  }

  // check if subscriber exists
  const subscriberExists =
    await User.findById(subscriberId).select("_id fullName");
  if (!subscriberExists) {
    throw new apiError(404, "Subscriber does not exist.");
  }

  const subscriptions = Subscription.aggregate([
    // Fetch only subscriptions for this subscriber
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    // get channel details
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          // Count total subscribers of each channel
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "channelSubscribers",
            },
          },
          {
            $addFields: {
              totalSubscribers: {
                $size: "$channelSubscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(req.user?._id),
                      "$channelSubscribers.subscriber",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          // Return only required channel fields
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
              totalSubscribers: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$channel",
    },
    // Map subscription doc → channel details
    {
      $project: {
        _id: "$channel._id",
        username: "$channel.username",
        fullName: "$channel.fullName",
        avatar: "$channel.avatar",
        totalSubscribers: "$channel.totalSubscribers",
        isSubscribed: "$channel.isSubscribed",
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const response = await Subscription.aggregatePaginate(subscriptions, options);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        response,
        "Subscribed channels fetched successfully."
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
