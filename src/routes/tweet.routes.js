import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getAllTweets,
  getAllUsersFeedTweets,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkUser } from "../middlewares/openRouteAuth.middlewares.js";

const router = Router();

router.route("/").post(verifyJWT, createTweet).get(checkUser, getAllTweets);

router.route("/user/:userId").get(checkUser, getUserTweets);
router.route("/feed").get(checkUser, getAllUsersFeedTweets)

router
  .route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);

export default router;
