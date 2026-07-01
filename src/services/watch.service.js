import watchRepository from "../repositories/watch.repository.js";
import ApiError from "../utils/ApiError.js";

/**
 * WatchService
 *
 * All business logic for watch sessions.
 * Repository handles DB. Controller handles HTTP. Service owns the logic in between.
 *
 * Completion Threshold:
 * A video is marked "completed" when progress >= 90% of duration.
 * 90% is standard industry practice (YouTube, Netflix use similar thresholds)
 * to account for users who skip the last few seconds of credits/outros.
 */

const COMPLETION_THRESHOLD = 0.9; // 90%

class WatchService {

    /**
     * Record or update a watch session.
     *
     * Called from the Watch route (NOT from getVideoById).
     * getVideoById stays clean — this is the Watch module's responsibility.
     *
     * Flow:
     * 1. Validate progress and duration values.
     * 2. Determine if video is completed (progress >= 90% of duration).
     * 3. Check if this is a rewatch (existing session that was completed).
     * 4. Upsert WatchSession.
     * 5. Update User.watchHistory (lightweight ref list).
     */
    async recordWatchSession({ userId, videoId, progress, duration }) {
        if (progress < 0) {
            throw new ApiError(400, "Progress cannot be negative");
        }
        if (duration <= 0) {
            throw new ApiError(400, "Duration must be greater than zero");
        }
        if (progress > duration) {
            // Clamp — some players send progress slightly over duration
            progress = duration;
        }

       const completed =
    duration > 0 &&
    progress / duration >= COMPLETION_THRESHOLD;

const existingSession =
    await watchRepository.getSession(
        userId,
        videoId
    );

// Never move progress backwards accidentally
const latestProgress = existingSession
    ? Math.max(existingSession.progress, progress)
    : progress;

// Detect rewatch
const isRewatch =
    existingSession?.completed === true &&
    completed;

// Save latest progress
const session =
    await watchRepository.upsertSession({
        userId,
        videoId,
        progress: latestProgress,
        duration,
        completed,
    });

        // Increment watchCount on rewatch
        if (isRewatch) {
            await watchRepository.incrementWatchCount(userId, videoId);
        }

        // Keep User.watchHistory in sync (lightweight ref list)
        await watchRepository.addToUserWatchHistory(userId, videoId);

        return session;
    }

    /**
     * Get resume position for a specific video.
     * Returns progress in seconds so the frontend can seek the player.
     * Returns 0 if no session exists (fresh watch).
     */
    async getResumePosition(userId, videoId) {
        const session = await watchRepository.getSession(userId, videoId);

        if (!session) {
            return { progress: 0, completed: false };
        }

        // If video was completed, return 0 so it starts from beginning
        // on next watch (standard behavior — matches YouTube)
        if (session.completed) {
            return { progress: 0, completed: true };
        }

        return {
            progress: session.progress,
            completed: false,
        };
    }

    /**
     * Get "Continue Watching" list.
     * Only incomplete sessions with progress > 0, most recent first.
     * Filters out videos whose sessions exist but video is now unpublished.
     */
    async getContinueWatching(userId, limit = 10) {
        const sessions = await watchRepository.getContinueWatching(
            userId,
            limit
        );

        // Filter out sessions where video populate returned null
        // (video was deleted or unpublished after session was created)
        return sessions.filter((s) => s.video !== null);
    }

    /**
     * Get paginated watch history.
     * Source of truth: WatchSession (not User.watchHistory array).
     * User.watchHistory is kept for quick lookups only.
     */
    async getWatchHistory(userId, page = 1, limit = 20) {
        if (page < 1) throw new ApiError(400, "Page must be at least 1");
        if (limit < 1 || limit > 50)
            throw new ApiError(400, "Limit must be between 1 and 50");

        const { sessions, total } = await watchRepository.getWatchHistory(
            userId,
            page,
            limit
        );

        // Filter null videos (deleted/unpublished)
        const filtered = sessions.filter((s) => s.video !== null);

        return {
            sessions: filtered,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        };
    }

    /**
     * Remove a single video from watch history.
     * Deletes WatchSession + removes from User.watchHistory.
     */
    async removeFromHistory(userId, videoId) {
        const session = await watchRepository.deleteSession(userId, videoId);

        if (!session) {
            throw new ApiError(
                404,
                "Watch session not found for this video"
            );
        }

        await watchRepository.removeFromUserWatchHistory(userId, videoId);

        return { removed: true };
    }

    /**
     * Clear entire watch history for a user.
     * Deletes all WatchSessions + clears User.watchHistory array.
     */
    async clearHistory(userId) {
        await Promise.all([
            watchRepository.clearAllSessions(userId),
            watchRepository.clearUserWatchHistory(userId),
        ]);

        return { cleared: true };
    }

    /**
     * Get watch stats for a user.
     * Consumed directly by Dashboard module later — no changes needed there.
     */
    async getWatchStats(userId) {
        return await watchRepository.getUserWatchStats(userId);
    }
}

export default new WatchService();