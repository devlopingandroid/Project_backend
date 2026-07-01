import commentService from "../services/comment.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * ------------------------------------------------------------------------
 * Create Comment
 * POST /comments/video/:videoId
 * ------------------------------------------------------------------------
 */
const createComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    const comment = await commentService.createComment(
        req.user._id,
        videoId,
        content
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            comment,
            "Comment created successfully."
        )
    );
});

/**
 * ------------------------------------------------------------------------
 * Create Reply
 * POST /comments/:commentId/reply
 * ------------------------------------------------------------------------
 */
const createReply = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const reply = await commentService.createReply(
        req.user._id,
        commentId,
        content
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            reply,
            "Reply created successfully."
        )
    );
});

/**
 * ------------------------------------------------------------------------
 * Get Video Comments
 * GET /comments/video/:videoId
 * ------------------------------------------------------------------------
 */
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const comments = await commentService.getVideoComments(
        videoId,
        page,
        limit
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "Comments fetched successfully."
        )
    );
});

/**
 * ------------------------------------------------------------------------
 * Get Replies
 * GET /comments/:commentId/replies
 * ------------------------------------------------------------------------
 */
const getReplies = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const replies = await commentService.getReplies(commentId);

    return res.status(200).json(
        new ApiResponse(
            200,
            replies,
            "Replies fetched successfully."
        )
    );
});

/**
 * ------------------------------------------------------------------------
 * Update Comment
 * PATCH /comments/:commentId
 * ------------------------------------------------------------------------
 */
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await commentService.updateComment(
        req.user._id,
        commentId,
        content
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            comment,
            "Comment updated successfully."
        )
    );
});

/**
 * ------------------------------------------------------------------------
 * Delete Comment
 * DELETE /comments/:commentId
 * ------------------------------------------------------------------------
 */
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const result = await commentService.deleteComment(
        req.user._id,
        commentId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Comment deleted successfully."
        )
    );
});

/**
 * ------------------------------------------------------------------------
 * Get Comment Count
 * GET /comments/video/:videoId/count
 * ------------------------------------------------------------------------
 */
const getCommentCount = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const result = await commentService.getCommentCount(videoId);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Comment count fetched successfully."
        )
    );
});

export {
    createComment,
    createReply,
    getVideoComments,
    getReplies,
    updateComment,
    deleteComment,
    getCommentCount,
};