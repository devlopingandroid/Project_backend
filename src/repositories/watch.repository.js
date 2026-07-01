import mongoose from "mongoose";
import WatchSession from "../models/watchSession.model.js";
import User from "../models/user.model.js";

/**
 * WatchRepository
 *
 * Owns all WatchSession and User.watchHistory DB operations.
 * No business logic here — only queries.
 * Service layer decides what to call and when.
 */

class WatchRepository {

    // ── WatchSession Queries ──────────────────────────────────────────────────

    /**
     * Upsert a watch session for user + video.
     * If session exists → update progress, lastWatchedAt, completed.
     * If session is new → create it.
     * Returns the updated/created document.
     */
    async upsertSession({ userId, videoId, progress, duration, completed }) {
        return await WatchSession.findOneAndUpdate(
    {
        user: new mongoose.Types.ObjectId(userId),
        video: new mongoose.Types.ObjectId(videoId),
    },
    {
        $set: {
            progress,
            duration,
            completed,
            lastWatchedAt: new Date(),
        },
    },
    {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
    }
);
    }

    /**
     * Increment watchCount when user rewatches a completed video.
     */
    async incrementWatchCount(userId, videoId) {
        return await WatchSession.findOneAndUpdate(
            {
                user: new mongoose.Types.ObjectId(userId),
                video: new mongoose.Types.ObjectId(videoId),
            },
            { $inc: { watchCount: 1 } },
            { new: true }
        );
    }

    /**
     * Get single session for a user + video (for resume playback).
     */
    async getSession(userId, videoId) {
        return await WatchSession.findOne({
            user: new mongoose.Types.ObjectId(userId),
            video: new mongoose.Types.ObjectId(videoId),
        });
    }

    /**
     * "Continue Watching" — user's incomplete sessions, most recent first.
     * Populates video with fields needed for the frontend card.
     */
    async getContinueWatching(userId, limit = 10) {
        return await WatchSession.find({
            user: new mongoose.Types.ObjectId(userId),
            completed: false,
            progress: { $gt: 0 },
        })
            .sort({ lastWatchedAt: -1 })
            .limit(limit)
            .populate({
                path: "video",
                match: { status: "published" }, // only show published videos
                select: "title thumbnail duration views owner createdAt",
                populate: {
                    path: "owner",
                    select: "username fullname avatar",
                },
            })
            .lean();
    }

    /**
     * Full watch history via WatchSession, paginated.
     * Returns all sessions (completed + incomplete), newest first.
     */
    async getWatchHistory(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            WatchSession.find({
                user: new mongoose.Types.ObjectId(userId),
            })
                .sort({ lastWatchedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "video",
                    match: { status: "published" },
                    select: "title thumbnail duration views owner createdAt",
                    populate: {
                        path: "owner",
                        select: "username fullname avatar",
                    },
                })
                .lean(),

            WatchSession.countDocuments({
                user: new mongoose.Types.ObjectId(userId),
            }),
        ]);

        return { sessions, total };
    }

    /**
     * Delete a single WatchSession (remove from history).
     * Also removes videoId from User.watchHistory array.
     */
    async deleteSession(userId, videoId) {
        return await WatchSession.findOneAndDelete({
            user: new mongoose.Types.ObjectId(userId),
            video: new mongoose.Types.ObjectId(videoId),
        });
    }

    /**
     * Clear all sessions for a user.
     * Used for "Clear watch history" feature.
     */
    async clearAllSessions(userId) {
        return await WatchSession.deleteMany({
            user: new mongoose.Types.ObjectId(userId),
        });
    }

    // ── Analytics Queries (consumed by Dashboard module later) ────────────────

    /**
     * Aggregate stats per user — Dashboard "my stats" card.
     */
    async getUserWatchStats(userId) {
        const result = await WatchSession.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $group: {
                    _id: "$user",
                    totalWatchTime: { $sum: "$progress" },        // seconds
                    totalVideosWatched: { $sum: 1 },
                    completedVideos: {
                        $sum: { $cond: ["$completed", 1, 0] },
                    },
                    avgProgress: { $avg: "$progress" },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalWatchTime: 1,
                    totalVideosWatched: 1,
                    completedVideos: 1,
                    avgProgress: { $round: ["$avgProgress", 2] },
                    completionRate: {
                        $round: [
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            "$completedVideos",
                                            "$totalVideosWatched",
                                        ],
                                    },
                                    100,
                                ],
                            },
                            2,
                        ],
                    },
                },
            },
        ]);

        return result[0] || {
            totalWatchTime: 0,
            totalVideosWatched: 0,
            completedVideos: 0,
            avgProgress: 0,
            completionRate: 0,
        };
    }
    /**
 * Add video to user's watch history
 */
async addToUserWatchHistory(userId, videoId) {
    return await User.findByIdAndUpdate(
        userId,
        {
            $addToSet: {
                watchHistory: videoId,
            },
        },
        {
            new: true,
        }
    );
}

/**
 * Remove one video from watch history
 */
async removeFromUserWatchHistory(userId, videoId) {
    return await User.findByIdAndUpdate(
        userId,
        {
            $pull: {
                watchHistory: videoId,
            },
        },
        {
            new: true,
        }
    );
}

/**
 * Clear entire watch history
 */
async clearUserWatchHistory(userId) {
    return await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                watchHistory: [],
            },
        },
        {
            new: true,
        }
    );
}
}

export default new WatchRepository();