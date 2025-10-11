import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addChannelDescription,
  addLink,
  getAboutChannel,
  removeLink,
  updateLink,
} from "../controllers/about.controller.js";

const router = Router();

router.route("/:userId").get(getAboutChannel);
router.route("/description").patch(verifyJWT, addChannelDescription);
router.route("/add/link").post(verifyJWT, addLink);
router.route("/u/link/:linkId").patch(verifyJWT, updateLink);
router.route("/remove/link/:linkId").delete(verifyJWT, removeLink);

export default router;
