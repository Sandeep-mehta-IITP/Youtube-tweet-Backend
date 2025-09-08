
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating access and refresh token."
    );
  }
};

// register user
const registerUser = asyncHandler(async (req, res) => {
  console.log("raw data", req.body);
  console.log("raw file data", req.files);
  console.log("Raw request headers:", req.headers);
  // user details from frontend
  const { fullName, username, email, password } = req.body;

  //console.log("User controller data", req.body);

  // if (
  //     [fullName, username, email, password].some((field) => field?.trim() === "")
  // ) {
  //     throw new apiError(400, "All fields are required .")
  // }

  const fields = { fullName, username, email, password };

  for (const [key, value] of Object.entries(fields)) {
    if (!value.trim()) {
      throw new apiError(400, `${key} is required.`);
    }
  }

  // check for existing user
  const existedUser = await User.findOne({
    $or: [
      {
        username: username.trim(),
      },
      {
        email: email.toLowerCase(),
      },
    ],
  }).lean(); // lean for optization in terms of memory and performace , it avoids unnesseray response from mongoDB.

  if (existedUser) {
    throw new apiError(
      409,
      existedUser.email === email.toLowerCase()
        ? "Email is already registered."
        : "Username is already taken."
    );
  }

  // check for images ,files
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  console.log("Avatar local path in regitration", avatarLocalPath);

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files?.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  console.log("cover Image local path in registration", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar image is required.");
  }

  // upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(500, "Failed to upload avatar to Cloudinary.");
  }
  if (coverImageLocalPath && !coverImage) {
    throw new apiError(500, "Failed to upload cover image to Cloudinary.");
  }

  // user creation
  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    email: email.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while creating the user.");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User created successfully"));
});

// login user
const loginUser = asyncHandler(async (req, res) => {
  // get details from frontend
  // validate information
  // find user
  // password checking
  // generate access and refresh token
  // send cookie

  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new apiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User does not exist");
  }

  const isValidPassword = await user.isPasswordCorrect(password, user.password);

  if (!isValidPassword) {
    throw new apiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in Successfully !!!"
      )
    );
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
  // clear refresgtoken from db
  // clear access and refresh token from frontend

  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: null,
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new apiResponse(200, {}, "Logout user."));
  } catch (error) {
    throw new apiError(
      500,
      error.message || "something went wrong while logout user !!!"
    );
  }
});

// regenerate access and refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      throw new apiError(400, "Unauthorized access");
    }

    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedRefreshToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh token.");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new apiError(401, "Resfresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // console.log("refresh access token", accessToken);
    // console.log("refresh token", newRefreshToken);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Refreshed access token successfuly."
        )
      );
  } catch (error) {
    throw new apiError(401, error.message || "Could not refresh access token");
  }
});

// change user password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new apiError(400, "Old password and new password is required.");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new apiError(404, "User not found.");
  }

  const isValidPassword = user.isPasswordCorrect(oldPassword);

  if (!isValidPassword) {
    throw new apiError(400, "Invalid old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password update successfully"));
});

// fetch login user information
const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new apiError(401, "User not authenticated");
  }
  return res
    .status(200)
    .json(
      new apiResponse(200, req.user, "Curent user deatils fetched successfully")
    );
});

// update user details like -> fullname , email
const updateUserDetails = asyncHandler(async (req, res) => {
  // get user deatails from frontend
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new apiError(400, "User details required");
  }

  // checking email is available or not
  const existingUser = await User.findOne({
    email,
    _id: { $ne: req.user._id }, // login user ki id ko chhod kr DB me sabhi id se match krne ke liye
  });

  if (existingUser) {
    throw new apiError(400, "Email already in use by another account");
  }

  // find user and update details
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "User details update successfully"));
});

// update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const localAvatarPath = req.file?.path;

  if (!localAvatarPath) {
    throw new apiError(400, "User avatar is missing");
  }

  console.log("localAvatarPath", localAvatarPath);

  try {
    const avatar = await uploadOnCloudinary(localAvatarPath);

    console.log("avatar", avatar);

    if (!avatar?.url) {
      throw new apiError(400, "Something went wrong while uploading avatar");
    }

    const oldAvatar = await User.findById(req.user?._id).select("avatar");

    if (oldAvatar?.avatar) {
      const publicId = oldAvatar.avatar
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];

      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new apiResponse(200, user, "Avatar updated successfully"));
  } catch (error) {
    console.error("Error updating avatar:", error);
    return res
      .status(500)
      .json(new apiResponse(500, {}, "Internal Server Error"));
  }
});

// update user cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const localCoverImagePath = req.file?.path;

  if (!localCoverImagePath) {
    throw new apiError(400, " User cover image is missing.");
  }

  try {
    const coverImage = await uploadOnCloudinary(localCoverImagePath);

    if (!coverImage?.url) {
      throw new apiError(
        400,
        "Something went wrong while uploading cover image."
      );
    }

    const oldCoverImage = await User.findById(req.user?._id).select(
      "coverImage"
    );

    if (oldCoverImage?.coverImage) {
      const publicId = oldCoverImage.coverImage
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];

      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new apiResponse(200, user, "Cover Image updated successfully."));
  } catch (error) {
    console.error("Error updating cover image:", error);
    return res
      .status(500)
      .json(new apiResponse(500, {}, "Internal Server Error"));
  }
});

// get user channel profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [new mongoose.Types.ObjectId(req.user?._id), "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new apiError(404, "Channel does not exist.");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "Channel details fetched successfully")  // hume array me se first element chahiye kyunki user ki ek hi profile hogi 
    );
});


// get user watch history
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
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
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch history fectched successfully."
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
