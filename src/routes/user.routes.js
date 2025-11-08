import { Router } from "express";
import {
  changeCurrentPassword,
  clearWatchHistory,
  forgotPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resetPassword,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
  verifyCurrentPassword,
  verifyOTP,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkUser } from "../middlewares/openRouteAuth.middlewares.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-access-token").post(refreshAccessToken);
router.route("/verify-password").post(verifyJWT, verifyCurrentPassword);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/forgot-password").post(forgotPassword);
router.route("/verify-otp").post(verifyOTP);
router.route("/reset-password").post(resetPassword);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/update-details").patch(verifyJWT, updateUserDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-coverImage")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(checkUser, getUserChannelProfile);
router
  .route("/history")
  .get(verifyJWT, getWatchHistory)
  .delete(verifyJWT, clearWatchHistory);

export default router;
