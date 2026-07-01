import likeService from "../services/like.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * --------------------------------------------------------------------------
 * Toggle Video Like
 * POST /likes/video/:videoId
 * --------------------------------------------------------------------------
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const result = await likeService.toggleVideoLike(
        req.user._id,
        videoId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            result.liked
                ? "Video liked successfully."
                : "Video unliked successfully."
        )
    );
});

/**
 * --------------------------------------------------------------------------
 * Toggle Comment Like
 * POST /likes/comment/:commentId
 * --------------------------------------------------------------------------
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const result = await likeService.toggleCommentLike(
        req.user._id,
        commentId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            result.liked
                ? "Comment liked successfully."
                : "Comment unliked successfully."
        )
    );
});

/**
 * --------------------------------------------------------------------------
 * Get Video Likes
 * GET /likes/video/:videoId
 * --------------------------------------------------------------------------
 */
const getVideoLikes = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const result = await likeService.getVideoLikes(
        req.user._id,
        videoId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Video likes fetched successfully."
        )
    );
});

/**
 * --------------------------------------------------------------------------
 * Get Comment Likes
 * GET /likes/comment/:commentId
 * --------------------------------------------------------------------------
 */
const getCommentLikes = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const result = await likeService.getCommentLikes(
        req.user._id,
        commentId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Comment likes fetched successfully."
        )
    );
});

/**
 * --------------------------------------------------------------------------
 * Get User Liked Videos
 * GET /likes/videos
 * --------------------------------------------------------------------------
 */
const getLikedVideos = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await likeService.getLikedVideos(
        req.user._id,
        page,
        limit
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Liked videos fetched successfully."
        )
    );
});

export {
    toggleVideoLike,
    toggleCommentLike,
    getVideoLikes,
    getCommentLikes,
    getLikedVideos,
};