import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import videoService from "../services/video.service.js";

/**
 * Publish Video
 */
export const publishVideo = asyncHandler(async (req, res) => {
    const video = await videoService.publishVideo(
        req.body,
        req.files,
        req.user
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            video,
            "Video published successfully."
        )
    );
});

/**
 * Get All Videos
 */
export const getAllVideos = asyncHandler(async (req, res) => {
    const videos = await videoService.getAllVideos(req.query);

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully."
        )
    );
});

/**
 * Get Single Video
 */
export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await videoService.getVideoById(videoId);

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully."
        )
    );
});

/**
 * Update Video
 */
export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const updatedVideo = await videoService.updateVideo(
        videoId,
        req.body,
        req.files,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedVideo,
            "Video updated successfully."
        )
    );
});

/**
 * Delete Video
 */
export const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    await videoService.deleteVideo(
        videoId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Video deleted successfully."
        )
    );
});

/**
 * Toggle Publish Status
 */
export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await videoService.togglePublishStatus(
        videoId,
        req.user
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video publish status updated successfully."
        )
    );
});