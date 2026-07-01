import ApiError from "../utils/ApiError.js";
import videoRepository from "../repositories/video.repository.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";

class VideoService {
    /**
     * Publish a new video
     */
    async publishVideo(data, files, user) {
        const { title, description= "",
 } = data;

        if (!title?.trim()) {
            throw new ApiError(400, "Video title is required");
        }

        if (!files?.videoFile?.[0]) {
            throw new ApiError(400, "Video file is required");
        }

        if (!files?.thumbnail?.[0]) {
            throw new ApiError(400, "Thumbnail is required");
        }

        const videoPath = files.videoFile[0].path;
        const thumbnailPath = files.thumbnail[0].path;

        // Upload both files in parallel
        const [videoUpload, thumbnailUpload] = await Promise.all([
            uploadOnCloudinary(videoPath, "video", "streamify/videos"),
            uploadOnCloudinary(thumbnailPath, "image", "streamify/thumbnails"),
        ]);

        if (!videoUpload || !thumbnailUpload) {
            throw new ApiError(500, "Cloudinary upload failed");
        }

        try {
            const createdVideo = await videoRepository.create({
                title,
                description,
                owner: user._id,

                videoFile: videoUpload.secure_url,
                thumbnail: thumbnailUpload.secure_url,

                videoFilePublicId: videoUpload.public_id,
                thumbnailPublicId: thumbnailUpload.public_id,

                duration: videoUpload.duration || 0,

                views: 0,
                isPublished: true,
            });

            return createdVideo;
        } catch (error) {
            // Rollback uploaded files
           await Promise.all([
    deleteFromCloudinary(videoUpload.public_id, "video"),
    deleteFromCloudinary(thumbnailUpload.public_id, "image"),
]);

            throw new ApiError(
                500,
                "Unable to publish video"
            );
        }
    }

    /**
     * Get single video
     */
    async getVideoById(videoId) {
        const video = await videoRepository.findByIdWithOwner(videoId);

        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        await videoRepository.incrementViews(videoId);

        return video;
    }
        /**
     * Get all published videos
     */
    async getAllVideos(queryParams = {}) {
        const {
            page = 1,
            limit = 10,
            query = "",
            sortBy = "createdAt",
            sortType = "desc",
            userId,
        } = queryParams;

        const match = {
            isPublished: true,
        };

        if (userId) {
            match.owner = videoRepository.toObjectId(userId);
        }

        if (query.trim()) {
            match.$text = {
                $search: query,
            };
        }

        const pipeline = [
            {
                $match: match,
            },

            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                fullname: 1,
                                username: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },

            {
                $addFields: {
                    owner: {
                        $first: "$owner",
                    },
                },
            },

            {
                $sort: {
                    [sortBy]: sortType === "asc" ? 1 : -1,
                },
            },
        ];

        return await videoRepository.getFeed(pipeline, {
            page: Number(page),
            limit: Number(limit),
        });
    }

    /**
     * Update Video
     */
    async updateVideo(videoId, data, files, user) {
        const video = await videoRepository.findById(videoId);

        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        if (video.owner.toString() !== user._id.toString()) {
            throw new ApiError(
                403,
                "You are not allowed to update this video."
            );
        }

        const updateData = {};

        if (data.title) {
            updateData.title = data.title;
        }

        if (data.description) {
            updateData.description = data.description;
        }

        if (files?.thumbnail?.[0]) {
            const thumbnailUpload = await uploadOnCloudinary(
                files.thumbnail[0].path,
                "image",
                "streamify/thumbnails"
            );

            if (!thumbnailUpload) {
                throw new ApiError(
                    500,
                    "Thumbnail upload failed"
                );
            }

            await deleteFromCloudinary(
                video.thumbnailPublicId,
                "image"
            );

            updateData.thumbnail = thumbnailUpload.secure_url;
            updateData.thumbnailPublicId =
                thumbnailUpload.public_id;
        }

        return await videoRepository.update(
            videoId,
            updateData
        );
    }

    /**
     * Delete Video
     */
    async deleteVideo(videoId, user) {
        const video = await videoRepository.findById(videoId);

        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        if (video.owner.toString() !== user._id.toString()) {
            throw new ApiError(
                403,
                "You are not allowed to delete this video."
            );
        }

        await Promise.all([
            deleteFromCloudinary(
                video.videoFilePublicId,
                "video"
            ),
            deleteFromCloudinary(
                video.thumbnailPublicId,
                "image"
            ),
        ]);

        await videoRepository.delete(videoId);

        return true;
    }

    /**
     * Toggle Publish Status
     */
    async togglePublishStatus(videoId, user) {
        const video = await videoRepository.findById(videoId);

        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        if (video.owner.toString() !== user._id.toString()) {
            throw new ApiError(
                403,
                "You are not allowed to perform this action."
            );
        }

        return await videoRepository.togglePublish(video);
    }
}

export default new VideoService();