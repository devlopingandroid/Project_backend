import mongoose from "mongoose";
import Subscription from "../models/subscription.model.js";

/**
 * SubscriptionRepository
 *
 * Owns every query against the Subscription collection.
 * Zero business logic — that belongs in SubscriptionService.
 * Zero HTTP awareness — that belongs in SubscriptionController.
 *
 * Every method receives plain values (userId strings, pagination numbers)
 * and returns plain Mongoose results. The service layer decides what to do
 * with them.
 */

class SubscriptionRepository {

    // ── Core CRUD ─────────────────────────────────────────────────────────────

    /**
     * Create a new subscription document.
     * The compound unique index on { subscriber, channel } guarantees
     * no duplicate can be inserted even under concurrent requests —
     * MongoDB will throw a duplicate key error (code 11000) which the
     * service layer catches and handles gracefully.
     */
    async create(subscriberId, channelId) {
        return await Subscription.create({
            subscriber: new mongoose.Types.ObjectId(subscriberId),
            channel: new mongoose.Types.ObjectId(channelId),
        });
    }

    /**
     * Delete a subscription document by its _id.
     * Receives the document _id (not subscriber/channel pair) because
     * the service already fetched the document in the toggle flow —
     * no need for a second query with the full pair.
     */
    async deleteById(subscriptionId) {
        return await Subscription.findByIdAndDelete(subscriptionId);
    }

    /**
     * Find one subscription by subscriber + channel pair.
     * Primary lookup for toggle and status checks.
     * Uses the compound unique index — O(log n).
     * Returns null if not found (service checks for null).
     */
    async findOne(subscriberId, channelId) {
        return await Subscription.findOne({
            subscriber: new mongoose.Types.ObjectId(subscriberId),
            channel: new mongoose.Types.ObjectId(channelId),
        });
    }

    /**
     * Boolean existence check — cheaper than findOne when the document
     * content is not needed (e.g. status API alongside a count query).
     * Uses the same compound index as findOne but returns early.
     */
    async exists(subscriberId, channelId) {
        const doc = await Subscription.exists({
            subscriber: new mongoose.Types.ObjectId(subscriberId),
            channel: new mongoose.Types.ObjectId(channelId),
        });
        return !!doc;
    }

    // ── Count Queries ─────────────────────────────────────────────────────────

    /**
     * Total number of subscribers for a channel.
     * Uses { channel: 1, createdAt: -1 } index — covered query, no collection scan.
     */
    async countSubscribers(channelId) {
        return await Subscription.countDocuments({
            channel: new mongoose.Types.ObjectId(channelId),
        });
    }

    /**
     * Total number of channels a user is subscribed to.
     * Uses { subscriber: 1, createdAt: -1 } index.
     */
    async countSubscriptions(subscriberId) {
        return await Subscription.countDocuments({
            subscriber: new mongoose.Types.ObjectId(subscriberId),
        });
    }

    // ── List Queries ──────────────────────────────────────────────────────────

    /**
     * Paginated list of subscribers for a channel.
     * Populates subscriber user details needed for the UI card.
     * Sorted newest subscriber first.
     *
     * Returns { subscribers, total } so service can build pagination metadata
     * without a second repository call.
     */
    async getSubscribers(channelId, page, limit) {
        const skip = (page - 1) * limit;

        const [subscribers, total] = await Promise.all([
            Subscription.find({
                channel: new mongoose.Types.ObjectId(channelId),
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "subscriber",
                    select: "username fullname avatar",
                })
                .lean(),

            Subscription.countDocuments({
                channel: new mongoose.Types.ObjectId(channelId),
            }),
        ]);

        return { subscribers, total };
    }

    /**
     * Paginated list of channels a user has subscribed to.
     * Populates channel user details needed for the subscription list UI.
     * Sorted by most recently subscribed first.
     *
     * Returns { channels, total } for pagination metadata.
     */
    async getSubscribedChannels(subscriberId, page, limit) {
        const skip = (page - 1) * limit;

        const [channels, total] = await Promise.all([
            Subscription.find({
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "channel",
                    select: "username fullname avatar coverImage",
                })
                .lean(),

            Subscription.countDocuments({
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            }),
        ]);

        return { channels, total };
    }

    // ── Feed ──────────────────────────────────────────────────────────────────

    /**
     * Subscription feed: published videos from all channels a user subscribes to.
     *
     * Aggregation pipeline breakdown:
     *
     * Stage 1 — $match: filter this user's subscriptions.
     *   Uses { subscriber: 1, createdAt: -1 } index.
     *
     * Stage 2 — $lookup videos: join Video collection where video.owner
     *   matches subscription.channel AND video.status = "published".
     *   The pipeline inside $lookup does the status filter BEFORE the join
     *   result is returned — more efficient than filtering after the join.
     *
     * Stage 3 — $unwind: flatten the joined videos array.
     *   preserveNullAndEmptyArrays: false → channels with no published videos
     *   are silently dropped (correct behavior for a feed).
     *
     * Stage 4 — $replaceRoot: promote the video document to the top level.
     *   Result documents are Videos (with owner populated), not Subscriptions.
     *   This is the shape the frontend expects.
     *
     * Stage 5 — $lookup owner: join User for owner avatar/username.
     *   Done after replaceRoot because we now have video.owner to join on.
     *
     * Stage 6 — $addFields: flatten owner array → single object.
     *
     * Stage 7 — $sort: newest videos first across all subscribed channels.
     *
     * Stage 8/9 — $facet for combined data + total count in one round-trip.
     *   Without $facet, pagination requires two separate aggregation calls.
     *
     * @param {string} subscriberId
     * @param {number} page
     * @param {number} limit
     * @returns {{ videos: Array, total: number }}
     */
    async getSubscriptionFeed(subscriberId, page, limit) {
        const skip = (page - 1) * limit;

        const result = await Subscription.aggregate([
            // Stage 1: this user's subscriptions only
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(subscriberId),
                },
            },

            // Stage 2: join published videos from each subscribed channel
            {
                $lookup: {
                    from: "videos",
                    let: { channelId: "$channel" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$owner", "$$channelId"] },
                                        { $eq: ["$status", "published"] },
                                    ],
                                },
                            },
                        },
                        // Project only feed card fields — don't pull full video doc
                        {
                            $project: {
                                title: 1,
                                thumbnail: 1,
                                duration: 1,
                                views: 1,
                                owner: 1,
                                createdAt: 1,
                            },
                        },
                    ],
                    as: "videos",
                },
            },

            // Stage 3: one document per video (drop channels with no videos)
            {
                $unwind: {
                    path: "$videos",
                    preserveNullAndEmptyArrays: false,
                },
            },

            // Stage 4: video document becomes the root
            {
                $replaceRoot: { newRoot: "$videos" },
            },

            // Stage 5: join video owner details
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                fullname: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },

            // Stage 6: flatten owner array
            {
                $addFields: {
                    owner: { $first: "$owner" },
                },
            },

            // Stage 7: newest videos first
            {
                $sort: { createdAt: -1 },
            },

            // Stage 8: pagination + total in one round-trip
            {
                $facet: {
                    videos: [
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    totalCount: [
                        { $count: "count" },
                    ],
                },
            },
        ]);

        // $facet always returns one document
        const videos = result[0]?.videos || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;

        return { videos, total };
    }
}

export default new SubscriptionRepository();