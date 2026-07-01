import mongoose, { Schema } from "mongoose";

/**
 * WatchSession Model
 *
 * Design Decisions:
 *
 * 1. user + video compound unique index → one session document per user per video.
 *    On re-watch, the existing document is updated (upsert), not duplicated.
 *    This keeps the collection size bounded and queries fast.
 *
 * 2. progress (seconds watched) + duration (total video duration) stored together
 *    so completion rate can be calculated without a join to the Video collection.
 *    Dashboard queries stay single-collection and performant.
 *
 * 3. completed is a derived boolean but stored explicitly for fast filtering.
 *    "Continue Watching" = { completed: false, progress: > 0 }
 *    "Watched" = { completed: true }
 *    Recalculating this on every query would be expensive at scale.
 *
 * 4. lastWatchedAt is separate from createdAt/updatedAt.
 *    createdAt = first time user ever watched this video.
 *    lastWatchedAt = most recent watch event (updated on every progress update).
 *    This distinction matters for "recently watched" vs "first watched" analytics.
 *
 * 5. watchCount tracks how many times user has rewatched the same video.
 *    Useful for recommendations ("user rewatched this 3 times").
 *
 * 6. All Dashboard metrics this schema supports without joins:
 *    - Total watch time per user    → sum(progress) where user = X
 *    - Average watch duration       → avg(progress)
 *    - Completion rate              → count(completed=true) / count(*)
 *    - Most watched videos          → group by video, sort by watchCount
 *    - Recently watched             → sort by lastWatchedAt desc
 *    - Watch time per day/week      → group by lastWatchedAt date parts
 */

const watchSessionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
            index: true,
        },
        // Seconds the user has watched so far in this session
        progress: {
            type: Number,
            default: 0,
            min: [0, "Progress cannot be negative"],
        },
        // Total video duration in seconds — copied from Video at session creation
        // Stored here so Dashboard can compute completion % without Video join
        duration: {
            type: Number,
            default: 0,
            min: [0, "Duration cannot be negative"],
        },
        // True when progress >= 90% of duration (set by service layer)
        completed: {
            type: Boolean,
            default: false,
            index: true,
        },
        // Updated every time progress is recorded — used for "recently watched"
        lastWatchedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        // How many times user has fully rewatched this video
        watchCount: {
            type: Number,
            default: 0,
            min: 1,
        },
    },
    {
        timestamps: true, // createdAt = first watch, updatedAt = last DB write
    }
);

watchSessionSchema.pre("save", function (next) {
    if (this.progress > this.duration) {
        this.progress = this.duration;
    }

    next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
watchSessionSchema.virtual("completionPercentage").get(function () {

    if(this.duration===0) return 0;

    return Math.round((this.progress/this.duration)*100);

});

// One session per user per video — enforced at DB level
watchSessionSchema.index({ user: 1, video: 1 }, { unique: true });

// "Continue Watching" query: user's incomplete sessions, newest first
watchSessionSchema.index({ user: 1, completed: 1, lastWatchedAt: -1 });

// Dashboard: recent activity across all users (admin analytics)
watchSessionSchema.index({ lastWatchedAt: -1 });

// Dashboard: most watched videos globally
watchSessionSchema.index({ video: 1, watchCount: -1 });


const WatchSession = mongoose.model("WatchSession", watchSessionSchema);

export default WatchSession;