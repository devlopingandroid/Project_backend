import watchService from "../services/watch.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Record / Update Watch Session
 * POST /watch/:videoId
 */
const recordWatchSession = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { progress, duration } = req.body;

    const session = await watchService.recordWatchSession({
        userId: req.user._id,
        videoId,
        progress,
        duration,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            session,
            "Watch session recorded successfully."
        )
    );
});

/**
 * Resume Playback
 * GET /watch/:videoId/resume
 */
const getResumePosition = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const data = await watchService.getResumePosition(
        req.user._id,
        videoId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            data,
            "Resume position fetched successfully."
        )
    );
});

/**
 * Continue Watching
 * GET /watch/continue-watching
 */
const getContinueWatching = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;

    const sessions = await watchService.getContinueWatching(
        req.user._id,
        limit
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            sessions,
            "Continue watching list fetched successfully."
        )
    );
});

/**
 * Watch History
 * GET /watch/history
 */
const getWatchHistory = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const history = await watchService.getWatchHistory(
        req.user._id,
        page,
        limit
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            history,
            "Watch history fetched successfully."
        )
    );
});

/**
 * Remove Single History Item
 * DELETE /watch/history/:videoId
 */
const removeFromHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const result = await watchService.removeFromHistory(
        req.user._id,
        videoId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Video removed from watch history successfully."
        )
    );
});

/**
 * Clear Watch History
 * DELETE /watch/history
 */
const clearHistory = asyncHandler(async (req, res) => {
    const result = await watchService.clearHistory(req.user._id);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Watch history cleared successfully."
        )
    );
});

/**
 * Watch Statistics
 * GET /watch/stats
 */
const getWatchStats = asyncHandler(async (req, res) => {
    const stats = await watchService.getWatchStats(req.user._id);

    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "Watch statistics fetched successfully."
        )
    );
});

export {
    recordWatchSession,
    getResumePosition,
    getContinueWatching,
    getWatchHistory,
    removeFromHistory,
    clearHistory,
    getWatchStats,
};