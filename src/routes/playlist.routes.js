import { Router } from "express";
import {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylistById,
    getMyPlaylists,
    getPublicPlaylistsByUser,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    changeVisibility,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    validateCreatePlaylist,
    validateUpdatePlaylist,
    validatePlaylistId,
    validatePlaylistAndVideoId,
    validateUserId,
    validateVisibility,
    validatePagination,
} from "../validators/playlist.validator.js";

const router = Router();

/**
 * Route Order Note:
 * Static segments (/me, /user/:userId) registered BEFORE /:playlistId
 * to prevent "me" being treated as a playlistId param by Express.
 */

// ── Static Routes First ───────────────────────────────────────────────────────

// Create playlist (auth required)
router.post(
    "/",
    verifyJWT,
    validateCreatePlaylist,
    createPlaylist
);

// Current user's playlists — all visibility types (auth required)
router.get(
    "/me",
    verifyJWT,
    validatePagination,
    getMyPlaylists
);

// Public playlists of any user — public only (auth not required)
router.get(
    "/user/:userId",
    validateUserId,
    validatePagination,
    getPublicPlaylistsByUser
);

// ── Dynamic Routes After ──────────────────────────────────────────────────────

// Get playlist detail — auth optional (needed for private playlist ownership check)
router.get(
    "/:playlistId",
    verifyJWT,
    validatePlaylistId,
    getPlaylistById
);

// Update playlist metadata (auth required, owner only)
router.patch(
    "/:playlistId",
    verifyJWT,
    validateUpdatePlaylist,
    updatePlaylist
);

// Delete playlist (auth required, owner only)
router.delete(
    "/:playlistId",
    verifyJWT,
    validatePlaylistId,
    deletePlaylist
);

// Change visibility (auth required, owner only)
router.patch(
    "/:playlistId/visibility",
    verifyJWT,
    validateVisibility,
    changeVisibility
);

// Add video to playlist (auth required, owner only)
router.post(
    "/:playlistId/videos/:videoId",
    verifyJWT,
    validatePlaylistAndVideoId,
    addVideoToPlaylist
);

// Remove video from playlist (auth required, owner only)
router.delete(
    "/:playlistId/videos/:videoId",
    verifyJWT,
    validatePlaylistAndVideoId,
    removeVideoFromPlaylist
);

export default router;