import ApiError from "../utils/ApiError.js";
import likeRepository from "../repositories/like.repository.js";

class LikeService {

    /**
     * ------------------------------------------------------------------------
     * Toggle Video Like
     * ------------------------------------------------------------------------
     */
    async toggleVideoLike(userId, videoId) {

        if (!likeRepository.isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video ID");
        }

        const existingLike =
            await likeRepository.findVideoLike(
                userId,
                videoId
            );

        let liked;

        if (existingLike) {

            await likeRepository.delete(existingLike._id);

            liked = false;

        } else {

            await likeRepository.create({
                likedBy: userId,
                video: videoId,
            });

            liked = true;
        }

        const totalLikes =
            await likeRepository.countVideoLikes(videoId);

        return {
            liked,
            totalLikes,
        };
    }

    /**
     * ------------------------------------------------------------------------
     * Toggle Comment Like
     * ------------------------------------------------------------------------
     */
    async toggleCommentLike(userId, commentId) {

        if (!likeRepository.isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment ID");
        }

        const existingLike =
            await likeRepository.findCommentLike(
                userId,
                commentId
            );

        let liked;

        if (existingLike) {

            await likeRepository.delete(existingLike._id);

            liked = false;

        } else {

            await likeRepository.create({
                likedBy: userId,
                comment: commentId,
            });

            liked = true;
        }

        const totalLikes =
            await likeRepository.countCommentLikes(commentId);

        return {
            liked,
            totalLikes,
        };
    }

    /**
     * ------------------------------------------------------------------------
     * Video Like Details
     * ------------------------------------------------------------------------
     */
    async getVideoLikes(userId, videoId) {

        const [
            totalLikes,
            likedByCurrentUser,
        ] = await Promise.all([

            likeRepository.countVideoLikes(videoId),

            likeRepository.hasLikedVideo(
                userId,
                videoId
            ),
        ]);

        return {

            totalLikes,

            likedByCurrentUser:
                Boolean(likedByCurrentUser),
        };
    }

    /**
     * ------------------------------------------------------------------------
     * Comment Like Details
     * ------------------------------------------------------------------------
     */
    async getCommentLikes(userId, commentId) {

        const [
            totalLikes,
            likedByCurrentUser,
        ] = await Promise.all([

            likeRepository.countCommentLikes(commentId),

            likeRepository.hasLikedComment(
                userId,
                commentId
            ),
        ]);

        return {

            totalLikes,

            likedByCurrentUser:
                Boolean(likedByCurrentUser),
        };
    }

    /**
     * ------------------------------------------------------------------------
     * User Liked Videos
     * ------------------------------------------------------------------------
     */
    async getLikedVideos(
        userId,
        page = 1,
        limit = 10
    ) {

        const {
            likes,
            total,
        } =
            await likeRepository.getLikedVideos(
                userId,
                page,
                limit
            );

        return {

            likes,

            total,

            page,

            limit,

            totalPages:
                Math.ceil(total / limit),

            hasNextPage:
                page * limit < total,

            hasPrevPage:
                page > 1,
        };
    }
}

export default new LikeService();