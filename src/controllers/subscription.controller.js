import subscriptionService from "../services/subscription.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * SubscriptionController
 *
 * Thin by design. Every method does exactly three things:
 * 1. Extract values from req (params, query, user)
 * 2. Call the service
 * 3. Return ApiResponse
 *
 * No business logic. No DB calls. No error construction.
 */

/**
 * POST /subscriptions/:channelId
 * Toggle subscribe / unsubscribe.
 * Returns { subscribed: true/false } so frontend updates button state immediately.
 */
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const result = await subscriptionService.toggleSubscription(
        req.user._id,
        channelId
    );

    const message = result.subscribed
        ? "Subscribed successfully"
        : "Unsubscribed successfully";

    return res
        .status(200)
        .json(new ApiResponse(200, result, message));
});

/**
 * GET /subscriptions/:channelId/status
 * Returns { isSubscribed: Boolean, subscriberCount: Number }
 * subscriberId can be null for unauthenticated requests — service handles it.
 */
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const result = await subscriptionService.getSubscriptionStatus(
    req.user._id,
    channelId
);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription status fetched"));
});

/**
 * GET /subscriptions/:channelId/subscribers
 * Paginated subscriber list for any channel.
 * query: page, limit
 */
const getSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await subscriptionService.getSubscribers(
        channelId,
        page,
        limit
    );

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscribers fetched"));
});

/**
 * GET /subscriptions/channels
 * Channels the current authenticated user subscribes to.
 * query: page, limit
 */
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await subscriptionService.getSubscribedChannels(
        req.user._id,
        page,
        limit
    );

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscribed channels fetched"));
});

/**
 * GET /subscriptions/feed
 * Published videos from all channels the user subscribes to.
 * Sorted newest first. Paginated.
 * query: page, limit
 */
const getSubscriptionFeed = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await subscriptionService.getSubscriptionFeed(
        req.user._id,
        page,
        limit
    );

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Subscription feed fetched"));
});

export {
    toggleSubscription,
    getSubscriptionStatus,
    getSubscribers,
    getSubscribedChannels,
    getSubscriptionFeed,
};