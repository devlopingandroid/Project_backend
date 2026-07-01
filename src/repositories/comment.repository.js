import mongoose from "mongoose";
import Comment from "../models/comment.model.js";

/**
 * Comment Repository
 *
 * Responsibilities:
 * -----------------
 * • Pure database operations only
 * • No validation
 * • No business logic
 * • No ApiResponse / ApiError
 */

class CommentRepository {

    /**
     * Create Comment
     */
    async create(data) {
        return await Comment.create(data);
    }

    /**
     * Find Comment by ID
     */
    async findById(commentId) {
        return await Comment.findById(
            new mongoose.Types.ObjectId(commentId)
        );
    }

    /**
     * Update Comment
     */
    async update(commentId, updateData) {
        return await Comment.findByIdAndUpdate(
            commentId,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );
    }

    /**
     * Delete Comment
     */
    async delete(commentId) {
        return await Comment.findByIdAndDelete(commentId);
    }

    /**
     * Get Root Comments of a Video
     */
    async getVideoComments(videoId, page = 1, limit = 10) {

        const skip = (page - 1) * limit;

        const [comments, total] = await Promise.all([

            Comment.find({
                video: videoId,
                parentComment: null,
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate(
                    "owner",
                    "username fullname avatar"
                )
                .lean(),

            Comment.countDocuments({
                video: videoId,
                parentComment: null,
            }),

        ]);

        return {
            comments,
            total,
        };
    }

    /**
     * Get Replies
     */
    async getReplies(parentCommentId) {

        return await Comment.find({
            parentComment: parentCommentId,
        })
            .sort({
                createdAt: 1,
            })
            .populate(
                "owner",
                "username fullname avatar"
            )
            .lean();
    }

    /**
     * Increment Reply Count
     */
    async incrementReplyCount(commentId) {

        return await Comment.findByIdAndUpdate(
            commentId,
            {
                $inc: {
                    replyCount: 1,
                },
            },
            {
                new: true,
            }
        );
    }

    /**
     * Decrement Reply Count
     */
    async decrementReplyCount(commentId) {

        return await Comment.findByIdAndUpdate(
            commentId,
            {
                $inc: {
                    replyCount: -1,
                },
            },
            {
                new: true,
            }
        );
    }

    /**
     * Delete all replies
     * (Used when deleting a parent comment)
     */
    async deleteReplies(parentCommentId) {

        return await Comment.deleteMany({
            parentComment: parentCommentId,
        });
    }

    /**
     * Total comments on a video
     */
    async getCommentCount(videoId) {

        return await Comment.countDocuments({
            video: videoId,
        });
    }
}

export default new CommentRepository();