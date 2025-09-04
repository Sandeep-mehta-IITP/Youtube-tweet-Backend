import { log } from "console";
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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

const registerUser = asyncHandler(async (req, res) => {
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

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files?.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

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
export { registerUser, loginUser, logoutUser, refreshAccessToken };
