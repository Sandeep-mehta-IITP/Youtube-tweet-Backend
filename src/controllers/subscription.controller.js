import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
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

  const isSubscribed = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (isSubscribed) {
    // unsubscribe
    await isSubscribed.deleteOne();

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { subscribed: false },
          "Unsubscribed successfully."
        )
      );
  } else {
    // subscribe
    await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });

    return res
      .status(200)
      .json(
        new apiResponse(200, { subscribed: true }, "Subscribed  successfully")
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
