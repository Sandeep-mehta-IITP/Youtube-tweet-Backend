import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  getVideoSavePlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { checkUser } from "../middlewares/openRouteAuth.middlewares.js";

const router = Router();

router.route("/").post(verifyJWT, createPlaylist);

router
  .route("/:playlistId")
  .get(checkUser, getPlaylistById)
  .patch(verifyJWT, updatePlaylist)
  .delete(verifyJWT, deletePlaylist);

router.route("/add/:videoId/:playlistId").patch(verifyJWT, addVideoToPlaylist);
router
  .route("/remove/:videoId/:playlistId")
  .patch(verifyJWT, removeVideoFromPlaylist);

router.route("/user/:userId").get(checkUser, getUserPlaylists);
router.route("/user/playlists/:videoId").get(verifyJWT, getVideoSavePlaylists);

export default router;
