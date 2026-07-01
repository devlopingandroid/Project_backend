import mongoose from "mongoose";
import Like from "../models/like.model.js";

class LikeRepository {
    /**
     * ------------------------------------------------------------------------
     * Create Like
     * ------------------------------------------------------------------------
     */
    async create(data) {
        return await Like.create(data);
    }

    /**
     * ------------------------------------------------------------------------
     * Find Video Like
     * ------------------------------------------------------------------------
     */
    async findVideoLike(userId, videoId) {
        return await Like.findOne({
            likedBy: new mongoose.Types.ObjectId(userId),
            video: new mongoose.Types.ObjectId(videoId),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Find Comment Like
     * ------------------------------------------------------------------------
     */
    async findCommentLike(userId, commentId) {
        return await Like.findOne({
            likedBy: new mongoose.Types.ObjectId(userId),
            comment: new mongoose.Types.ObjectId(commentId),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Delete Like
     * ------------------------------------------------------------------------
     */
    async delete(id) {
        return await Like.findByIdAndDelete(id);
    }

    /**
     * ------------------------------------------------------------------------
     * Count Video Likes
     * ------------------------------------------------------------------------
     */
    async countVideoLikes(videoId) {
        return await Like.countDocuments({
            video: new mongoose.Types.ObjectId(videoId),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Count Comment Likes
     * ------------------------------------------------------------------------
     */
    async countCommentLikes(commentId) {
        return await Like.countDocuments({
            comment: new mongoose.Types.ObjectId(commentId),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Check Video Liked
     * ------------------------------------------------------------------------
     */
    async hasLikedVideo(userId, videoId) {
        return await Like.exists({
            likedBy: new mongoose.Types.ObjectId(userId),
            video: new mongoose.Types.ObjectId(videoId),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Check Comment Liked
     * ------------------------------------------------------------------------
     */
    async hasLikedComment(userId, commentId) {
        return await Like.exists({
            likedBy: new mongoose.Types.ObjectId(userId),
            comment: new mongoose.Types.ObjectId(commentId),
        });
    }

    /**
     * ------------------------------------------------------------------------
     * Get User Liked Videos
     * ------------------------------------------------------------------------
     */
    async getLikedVideos(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [likes, total] = await Promise.all([
            Like.find({
                likedBy: new mongoose.Types.ObjectId(userId),
                video: {
                    $ne: null,
                },
            })
                .sort({
                    createdAt: -1,
                })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "video",
                    match: {
                        status: "published",
                    },
                    populate: {
                        path: "owner",
                        select: "fullname username avatar",
                    },
                })
                .lean(),

            Like.countDocuments({
                likedBy: new mongoose.Types.ObjectId(userId),
                video: {
                    $ne: null,
                },
            }),
        ]);

        return {
            likes,
            total,
        };
    }

    /**
     * ------------------------------------------------------------------------
     * Validate ObjectId
     * ------------------------------------------------------------------------
     */
    isValidObjectId(id) {
        return mongoose.Types.ObjectId.isValid(id);
    }

    /**
     * ------------------------------------------------------------------------
     * Convert String -> ObjectId
     * ------------------------------------------------------------------------
     */
    toObjectId(id) {
        return new mongoose.Types.ObjectId(id);
    }
}

export default new LikeRepository();