import { Router } from "express";

import {
    toggleVideoLike,
    toggleCommentLike,
    getVideoLikes,
    getCommentLikes,
    getLikedVideos,
} from "../controllers/like.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    validateVideoIdParam,
    validateCommentIdParam,
    validatePagination,
} from "../validators/like.validator.js";

const router = Router();

/**
 * ============================================================================
 * Like Routes
 * Base URL: /likes
 *
 * All routes require authentication.
 * ============================================================================
 */

router.use(verifyJWT);

/* -------------------------------------------------------------------------- */
/*                             User Liked Videos                              */
/* -------------------------------------------------------------------------- */

router.get(
    "/videos",
    validatePagination,
    getLikedVideos
);

/* -------------------------------------------------------------------------- */
/*                                Video Likes                                 */
/* -------------------------------------------------------------------------- */

// Toggle Like / Unlike
router.post(
    "/video/:videoId",
    validateVideoIdParam,
    toggleVideoLike
);

// Get Like Information
router.get(
    "/video/:videoId",
    validateVideoIdParam,
    getVideoLikes
);

/* -------------------------------------------------------------------------- */
/*                               Comment Likes                                */
/* -------------------------------------------------------------------------- */

// Toggle Like / Unlike
router.post(
    "/comment/:commentId",
    validateCommentIdParam,
    toggleCommentLike
);

// Get Like Information
router.get(
    "/comment/:commentId",
    validateCommentIdParam,
    getCommentLikes
);

export default router;