import { Router } from "express";

import {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
} from "../controllers/video.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    uploadVideoFiles,
    uploadSingleImage,
} from "../middlewares/multer.middleware.js";

import {
    validatePublishVideo,
    validateUpdateVideo,
    validateGetAllVideos,
    validateVideoId,
} from "../validators/video.validator.js";

const router = Router();

/* ============================================================================
                                PUBLIC ROUTES
============================================================================ */

// Get all published videos
router.get(
    "/",
    validateGetAllVideos,
    getAllVideos
);

// Get single video
router.get(
    "/:videoId",
    validateVideoId,
    getVideoById
);

/* ============================================================================
                              PROTECTED ROUTES
============================================================================ */

// Publish new video
router.post(
    "/",
    verifyJWT,
    uploadVideoFiles,
    validatePublishVideo,
    publishVideo
);

// Update video details / thumbnail
router.patch(
    "/:videoId",
    verifyJWT,
    validateVideoId,
    uploadSingleImage,
    validateUpdateVideo,
    updateVideo
);

// Delete video
router.delete(
    "/:videoId",
    verifyJWT,
    validateVideoId,
    deleteVideo
);

// Toggle publish status
router.patch(
    "/:videoId/toggle-publish",
    verifyJWT,
    validateVideoId,
    togglePublishStatus
);

export default router;