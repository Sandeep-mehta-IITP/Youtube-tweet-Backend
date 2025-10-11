import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkUser } from "../middlewares/openRouteAuth.middlewares.js";

const router = Router();

router
  .route("/c/:channelId")
  .get(checkUser, getUserChannelSubscribers)
  .post(verifyJWT, toggleSubscription);

router.route("/u/:subscriberId").get(checkUser, getSubscribedChannels);

export default router;
