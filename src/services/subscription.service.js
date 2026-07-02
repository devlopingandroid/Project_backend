import subscriptionRepository from "../repositories/subscription.repository.js";
import ApiError from "../utils/ApiError.js";

/**
 * SubscriptionService
 *
 * All business rules for the Subscription module live here.
 * Repository handles DB. Controller handles HTTP. This owns everything between.
 */

class SubscriptionService {

    /**
     * Toggle subscription.
     *
     * Rules enforced here (not in model, not in controller):
     * 1. User cannot subscribe to themselves.
     * 2. If subscription exists → delete it (unsubscribe).
     * 3. If subscription does not exist → create it (subscribe).
     *
     * Returns { subscribed: boolean } so the frontend can update UI state
     * without a follow-up status call.
     *
     * Race condition note:
     * Two simultaneous subscribe requests for the same pair will result in
     * one success and one MongoDB duplicate key error (code 11000).
     * We catch that specific error and return a clean ApiError rather than
     * letting a 500 bubble up.
     */
    async toggleSubscription(subscriberId, channelId) {
        // Rule 1: prevent self-subscription
        if (subscriberId.toString() === channelId.toString()) {
            throw new ApiError(400, "You cannot subscribe to your own channel");
        }

        const existing = await subscriptionRepository.findOne(
            subscriberId,
            channelId
        );

        // Rule 2: already subscribed → unsubscribe
        if (existing) {
            await subscriptionRepository.deleteById(existing._id);
            return { subscribed: false };
        }

        // Rule 3: not subscribed → subscribe
        try {
            await subscriptionRepository.create(subscriberId, channelId);
        } catch (error) {
            // Duplicate key error: concurrent request already created the doc
            if (error?.code === 11000) {
                throw new ApiError(
                    409,
                    "Subscription already exists"
                );
            }
            throw error; // re-throw unexpected errors
        }

        return { subscribed: true };
    }

    /**
     * Get subscription status + subscriber count for a channel.
     * Called when the Watch page or Channel page loads.
     *
     * Runs exists() and countSubscribers() in parallel — single round-trip
     * latency rather than sequential awaits.
     *
     * subscriberId can be null (unauthenticated user viewing a channel).
     * In that case isSubscribed is always false.
     */
    async getSubscriptionStatus(subscriberId, channelId) {
        const [isSubscribed, subscriberCount] = await Promise.all([
            subscriberId
                ? subscriptionRepository.exists(subscriberId, channelId)
                : Promise.resolve(false),
            subscriptionRepository.countSubscribers(channelId),
        ]);

        return { isSubscribed, subscriberCount };
    }

    /**
     * Paginated list of a channel's subscribers.
     * Any authenticated user can view any channel's subscriber list
     * (same behavior as YouTube).
     */
    async getSubscribers(channelId, page, limit) {
        this._validatePagination(page, limit);

        const { subscribers, total } =
            await subscriptionRepository.getSubscribers(
                channelId,
                page,
                limit
            );

        return this._buildPaginatedResponse(subscribers, total, page, limit);
    }

    /**
     * Paginated list of channels the current user subscribes to.
     * Private — only the authenticated user can see their own subscriptions.
     */
    async getSubscribedChannels(subscriberId, page, limit) {
        this._validatePagination(page, limit);

        const { channels, total } =
            await subscriptionRepository.getSubscribedChannels(
                subscriberId,
                page,
                limit
            );

        return this._buildPaginatedResponse(channels, total, page, limit);
    }

    /**
     * Subscription feed: published videos from all subscribed channels.
     * Sorted newest first, paginated.
     *
     * Returns empty feed (not an error) if user has no subscriptions —
     * the frontend shows an "Subscribe to channels to see their videos" empty state.
     */
    async getSubscriptionFeed(subscriberId, page, limit) {
        this._validatePagination(page, limit);

        const { videos, total } =
            await subscriptionRepository.getSubscriptionFeed(
                subscriberId,
                page,
                limit
            );

        return this._buildPaginatedResponse(videos, total, page, limit);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Centralised pagination validation.
     * Throws ApiError so controller stays clean.
     */
    _validatePagination(page, limit) {
        if (page < 1) {
            throw new ApiError(400, "Page must be at least 1");
        }
        if (limit < 1 || limit > 50) {
            throw new ApiError(400, "Limit must be between 1 and 50");
        }
    }

    /**
     * Builds the standard paginated response shape used across all
     * list endpoints in this project.
     * Consistent shape means frontend pagination logic is reusable.
     */
    _buildPaginatedResponse(data, total, page, limit) {
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        };
    }
}

export default new SubscriptionService();