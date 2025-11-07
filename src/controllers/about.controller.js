import mongoose, { isValidObjectId } from "mongoose";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

//TODO: about channel
const getAboutChannel = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new apiError(400, "Invalid user Id.");
  }

  const aboutChannel = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    // fetch total videos and views
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
        pipeline: [
          {
            $match: {
              isPublished: true,
            },
          },
          {
            $project: {
              views: 1,
            },
          },
        ],
      },
    },
    // Fetch tweets
    {
      $lookup: {
        from: "tweets",
        localField: "_id",
        foreignField: "owner",
        as: "tweets",
        pipeline: [
          {
            $project: {
              _id: 1,
            },
          },
        ],
      },
    },
    // Compute totals using $addFields
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
        totalTweets: {
          $size: "$tweets",
        },
      },
    },
    // Final projection
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        links: 1,
        createdAt: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        totalTweets: 1,
      },
    },
  ]);

  if (!aboutChannel.length) {
    throw new apiError(404, "Channel not found.");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        aboutChannel[0],
        "About channel details fetched successfully."
      )
    );
});

//TODO: channel description
const addChannelDescription = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new apiError(400, "Content is required.");
  }

  const description = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        description: content || "",
      },
    },
    {
      new: true,
    }
  );

  if (!description) {
    throw new apiError(500, "Failed to add channel description.");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        description,
        "Channel description added successfully."
      )
    );
});

// TODO: add link
const addLink = asyncHandler(async (req, res) => {
  const { name, url } = req.body;

  if (!name) {
    throw new apiError(400, "Name is required.");
  }

  if (!url) {
    throw new apiError(400, "Url is required.");
  }

  const links = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $push: {
        links: {
          name,
          url,
        },
      },
    },
    {
      new: true,
    }
  ).select("username email fullName avatar coverImage description links");

  if (!links) {
    throw new apiError(500, "Failed to added link.");
  }

  return res
    .status(200)
    .json(new apiResponse(200, links, "Links added successfully."));
});

//TODO: update link
const updateLink = asyncHandler(async (req, res) => {
  const { name, url } = req.body;
  const { linkId } = req.params;

  if (!name && !url) {
    throw new apiError(400, "At least one of name or url is required.");
  }

  if (!linkId || !isValidObjectId(linkId)) {
    throw new apiError(400, "Invalid link id.");
  }

  const result = await User.updateOne(
    {
      _id: req.user?._id,
    },
    {
      $set: {
        "links.$[elem].name": name,
        "links.$[elem].url": url,
      },
    },
    {
      arrayFilters: [{ "elem._id": linkId }],
    }
  );

  if (!result.modifiedCount > 0) {
    throw new apiError(500, "Failed to update link");
  }

  return res
    .status(200)
    .json(new apiResponse(200, result, "Link updated successfully."));
});

//TODO: remove link
const removeLink = asyncHandler(async (req, res) => {
  const { linkId } = req.params;

  if (!linkId || !isValidObjectId(linkId)) {
    throw new apiError(400, "Invalid link id.");
  }

  const userBeforeUpdate = await User.findById(req.user?._id);
  if (!userBeforeUpdate.links.some((link) => link._id.toString() === linkId)) {
    throw new apiError(404, "Link not found.");
  }

  const link = await User.findByIdAndUpdate(
    {
      _id: req.user?._id,
    },
    {
      $pull: {
        links: { _id: linkId },
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new apiResponse(200, [], "Link removed successfully."));
});

export {
  getAboutChannel,
  addChannelDescription,
  addLink,
  updateLink,
  removeLink,
};
