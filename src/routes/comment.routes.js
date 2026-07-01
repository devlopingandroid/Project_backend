import { Router } from "express";

import {
    createComment,
    createReply,
    getVideoComments,
    getReplies,
    updateComment,
    deleteComment,
    getCommentCount,
} from "../controllers/comment.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    validateVideoIdParam,
    validateCommentIdParam,
    validateCommentContent,
    validatePagination,
} from "../validators/comment.validator.js";

const router = Router();

/**
 * ============================================================================
 * Comment Routes
 * Base URL: /comments
 *
 * All routes require authentication.
 * ============================================================================
 */

router.use(verifyJWT);

/* -------------------------------------------------------------------------- */
/*                               Video Comments                               */
/* -------------------------------------------------------------------------- */

// Create Comment
router.post(
    "/video/:videoId",
    validateVideoIdParam,
    validateCommentContent,
    createComment
);

// Get Video Comments
router.get(
    "/video/:videoId",
    validateVideoIdParam,
    validatePagination,
    getVideoComments
);

// Get Comment Count
router.get(
    "/video/:videoId/count",
    validateVideoIdParam,
    getCommentCount
);

/* -------------------------------------------------------------------------- */
/*                                   Replies                                  */
/* -------------------------------------------------------------------------- */

// Create Reply
router.post(
    "/:commentId/reply",
    validateCommentIdParam,
    validateCommentContent,
    createReply
);

// Get Replies
router.get(
    "/:commentId/replies",
    validateCommentIdParam,
    getReplies
);

/* -------------------------------------------------------------------------- */
/*                              Update / Delete                               */
/* -------------------------------------------------------------------------- */

// Update Comment
router.patch(
    "/:commentId",
    validateCommentIdParam,
    validateCommentContent,
    updateComment
);

// Delete Comment
router.delete(
    "/:commentId",
    validateCommentIdParam,
    deleteComment
);

export default router;