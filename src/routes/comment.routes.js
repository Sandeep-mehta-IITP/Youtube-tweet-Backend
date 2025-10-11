import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkUser } from "../middlewares/openRouteAuth.middlewares.js";

const router = Router();

router.route("/get/:videoId").get(checkUser, getVideoComments);
router.route("/add/:videoId").post(verifyJWT, addComment);
router
  .route("/c/:commentId")
  .delete(verifyJWT, deleteComment)
  .patch(verifyJWT, updateComment);

export default router;
