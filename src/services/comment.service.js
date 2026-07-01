import commentRepository from "../repositories/comment.repository.js";
import ApiError from "../utils/ApiError.js";

class CommentService {

    /**
     * ------------------------------------------------------------------------
     * Create Comment
     * ------------------------------------------------------------------------
     */
    async createComment(userId, videoId, content) {

        if (!content?.trim()) {
            throw new ApiError(400, "Comment content is required");
        }

        return await commentRepository.create({
            owner: userId,
            video: videoId,
            content: content.trim(),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Create Reply
     * ------------------------------------------------------------------------
     */
    async createReply(userId, parentCommentId, content) {

        if (!content?.trim()) {
            throw new ApiError(400, "Reply content is required");
        }

        const parentComment =
            await commentRepository.findById(parentCommentId);

        if (!parentComment) {
            throw new ApiError(404, "Parent comment not found");
        }

        const reply =
            await commentRepository.create({
                owner: userId,
                video: parentComment.video,
                parentComment: parentComment._id,
                content: content.trim(),
            });

        await commentRepository.incrementReplyCount(parentCommentId);

        return reply;
    }

    /**
     * ------------------------------------------------------------------------
     * Get Video Comments
     * ------------------------------------------------------------------------
     */
    async getVideoComments(videoId, page = 1, limit = 10) {

        const { comments, total } =
            await commentRepository.getVideoComments(
                videoId,
                page,
                limit
            );

        return {
            comments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        };
    }

    /**
     * ------------------------------------------------------------------------
     * Get Replies
     * ------------------------------------------------------------------------
     */
    async getReplies(parentCommentId) {

        const parent =
            await commentRepository.findById(parentCommentId);

        if (!parent) {
            throw new ApiError(404, "Comment not found");
        }

        return await commentRepository.getReplies(parentCommentId);
    }

    /**
     * ------------------------------------------------------------------------
     * Update Comment
     * ------------------------------------------------------------------------
     */
    async updateComment(userId, commentId, content) {

        if (!content?.trim()) {
            throw new ApiError(400, "Comment content is required");
        }

        const comment =
            await commentRepository.findById(commentId);

        if (!comment) {
            throw new ApiError(404, "Comment not found");
        }

        if (
            comment.owner.toString() !== userId.toString()
        ) {
            throw new ApiError(
                403,
                "You are not allowed to update this comment."
            );
        }

        return await commentRepository.update(
            commentId,
            {
                content: content.trim(),
                isEdited: true,
            }
        );
    }

    /**
     * ------------------------------------------------------------------------
     * Delete Comment
     * ------------------------------------------------------------------------
     */
    async deleteComment(userId, commentId) {

        const comment =
            await commentRepository.findById(commentId);

        if (!comment) {
            throw new ApiError(404, "Comment not found");
        }

        if (
            comment.owner.toString() !== userId.toString()
        ) {
            throw new ApiError(
                403,
                "You are not allowed to delete this comment."
            );
        }

        if (comment.parentComment) {
            await commentRepository.decrementReplyCount(
                comment.parentComment
            );
        } else {
            await commentRepository.deleteReplies(
                comment._id
            );
        }

        await commentRepository.delete(commentId);

        return {
            deleted: true,
        };
    }

    /**
     * ------------------------------------------------------------------------
     * Comment Count
     * ------------------------------------------------------------------------
     */
    async getCommentCount(videoId) {

        const total =
            await commentRepository.getCommentCount(videoId);

        return {
            totalComments: total,
        };
    }
}

export default new CommentService();