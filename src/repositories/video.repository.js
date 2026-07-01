import mongoose from "mongoose";
import Video from "../models/video.model.js";

class VideoRepository {
    /**
     * Create a new video document
     */
    async create(videoData) {
        return await Video.create(videoData);
    }

    /**
     * Find video by ID
     */
    async findById(videoId) {
        return await Video.findById(videoId);
    }

    /**
     * Find video by ID and populate owner details
     */
    async findByIdWithOwner(videoId) {
        return await Video.findById(videoId).populate(
            "owner",
            "fullname username avatar coverImage"
        );
    }

    /**
     * Update a video
     */
    async update(videoId, updateData) {
        return await Video.findByIdAndUpdate(
            videoId,
            {
                $set: updateData,
            },
            {
                new: true,
                runValidators: true,
            }
        );
    }

    /**
     * Delete a video
     */
    async delete(videoId) {
        return await Video.findByIdAndDelete(videoId);
    }

    /**
     * Increment views atomically
     */
    async incrementViews(videoId) {
        return await Video.findByIdAndUpdate(videoId, {
            $inc: {
                views: 1,
            },
        });
    }

    /**
     * Toggle publish status
     */
    async togglePublish(video) {
        video.isPublished = !video.isPublished;

        return await video.save({
            validateBeforeSave: false,
        });
    }

    /**
     * Aggregated Video Feed
     */
    async getFeed(pipeline, options) {
        return await Video.aggregatePaginate(
            Video.aggregate(pipeline),
            options
        );
    }

    /**
     * Check existence
     */
    async exists(videoId) {
        return await Video.exists({
            _id: videoId,
        });
    }

    /**
     * Validate ObjectId
     */
    isValidObjectId(id) {
        return mongoose.Types.ObjectId.isValid(id);
    }

    /**
     * Convert string → ObjectId
     */
    toObjectId(id) {
        return new mongoose.Types.ObjectId(id);
    }
}

export default new VideoRepository();