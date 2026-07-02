import mongoose, { Schema } from "mongoose";

/**
 * Subscription Model
 *
 * Design Decisions:
 *
 * 1. MINIMAL SCHEMA — intentionally.
 *    This document represents a single fact: "user A subscribes to channel B."
 *    Nothing else belongs here. Counts, names, avatars — all computed at query
 *    time via aggregation. Storing them here creates stale-data problems at scale.
 *
 * 2. BOTH FIELDS REFERENCE USER — not a separate Channel model.
 *    In this system a channel IS a user. subscriber = the person subscribing,
 *    channel = the user whose content they follow. Same collection, two roles.
 *
 * 3. NO subscriberCount ON USER MODEL.
 *    Cached counters on User require an atomic $inc/$dec on every toggle.
 *    Under high concurrency (viral channel gaining 10k subs/minute) this creates
 *    write contention. countDocuments() + proper indexes is fast enough for reads
 *    and correct by definition. Denormalization belongs in a caching layer (Redis),
 *    not in the source-of-truth document.
 *
 * 4. COMPOUND UNIQUE INDEX { subscriber, channel }:
 *    - Enforces one subscription per pair at the database level.
 *    - Duplicate protection that survives race conditions (two simultaneous
 *      subscribe requests will result in one success and one duplicate key error,
 *      not two subscription documents).
 *    - Also serves as the primary lookup index for toggle and status checks.
 *
 * 5. SELF-SUBSCRIPTION PREVENTION:
 *    Enforced in the service layer (subscriber !== channel check), not the schema.
 *    Schema-level enforcement would require a custom validator that calls
 *    toString() comparisons inside Mongoose middleware — fragile and untestable.
 *    Service layer is the right place for business rules.
 *
 * 6. TIMESTAMPS:
 *    createdAt → "subscribed since" display, chronological feed ordering.
 *    updatedAt → not semantically useful for subscriptions (a subscription
 *    either exists or doesn't) but included via timestamps:true for consistency
 *    across all modules and potential audit use.
 *
 * 7. INDEXES BEYOND THE COMPOUND UNIQUE:
 *    - { channel: 1 } → "get all subscribers of this channel" query.
 *    - { subscriber: 1 } → "get all channels this user follows" query.
 *    - { subscriber: 1, createdAt: -1 } → subscription feed sorted by newest.
 *    The compound unique index already covers { subscriber, channel } lookups
 *    (toggle, exists checks) so no additional index needed for those.
 *
 * FUTURE MODULES THAT CONSUME THIS COLLECTION:
 *    Dashboard  → countDocuments({ channel: userId }) for subscriber analytics
 *    Feed       → find({ subscriber: userId }) → video lookup pipeline
 *    Recommendations → join Subscription + WatchSession for affinity scoring
 */

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Subscriber is required"],
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Channel is required"],
        },
    },
    {
        timestamps: true,
    }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * Primary uniqueness constraint.
 * Prevents duplicate subscriptions at the DB level.
 * Also used by: toggle (findOne), status check (exists).
 */
subscriptionSchema.index(
    { subscriber: 1, channel: 1 },
    { unique: true }
);

/**
 * Supports: GET /subscriptions/:channelId/subscribers
 * Query pattern: { channel: channelId } → paginated list of subscribers
 */
subscriptionSchema.index({ channel: 1, createdAt: -1 });

/**
 * Supports: GET /subscriptions/channels
 * Query pattern: { subscriber: userId } → paginated list of subscribed channels
 * Also used as starting point for feed aggregation pipeline.
 */
subscriptionSchema.index({ subscriber: 1, createdAt: -1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;