import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { checkAbort } from "../middlewares/abortRequest.middlewares.js";
import { checkUser } from "../middlewares/openRouteAuth.middlewares.js";

const router = Router();


router
  .route("/")
  .get(getAllVideos)
  .post(
    verifyJWT, 
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    checkAbort,
    publishAVideo
  );

router
  .route("/:videoId")
  .get( checkUser, getVideoById)
  .delete(verifyJWT, deleteVideo)
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo);

// router.route("/status/:videoId").get(getVideoStatus);

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

export default router;
