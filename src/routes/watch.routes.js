import { Router } from "express";
import {
    recordWatchSession,
    getResumePosition,
    getContinueWatching,
    getWatchHistory,
    removeFromHistory,
    clearHistory,
    getWatchStats,
} from "../controllers/watch.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    validateVideoIdParam,
    validateRecordSession,
    validatePagination,
} from "../validators/watch.validator.js";

const router = Router();

/**
 * ============================================================================
 * Watch Routes
 * Base URL: /api/v1/watch
 *
 * All routes require authentication.
 * ============================================================================
 */

router.use(verifyJWT);

/* -------------------------------------------------------------------------- */
/*                                Watch History                               */
/* -------------------------------------------------------------------------- */

// Get watch history
router.get(
    "/history",
    validatePagination,
    getWatchHistory
);

// Clear entire history
router.delete(
    "/history",
    clearHistory
);

// Remove one video from history
router.delete(
    "/history/:videoId",
    validateVideoIdParam,
    removeFromHistory
);

/* -------------------------------------------------------------------------- */
/*                           Continue Watching & Stats                        */
/* -------------------------------------------------------------------------- */

// Continue Watching
router.get(
    "/continue-watching",
    getContinueWatching
);

// Personal watch statistics
router.get(
    "/stats",
    getWatchStats
);

/* -------------------------------------------------------------------------- */
/*                             Resume & Watch Session                         */
/* -------------------------------------------------------------------------- */

// Get resume position
router.get(
    "/:videoId/resume",
    validateVideoIdParam,
    getResumePosition
);

// Record / Update watch session
router.post(
    "/:videoId",
    validateRecordSession,
    recordWatchSession
);

export default router;