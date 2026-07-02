import mongoose, { Schema } from "mongoose";

/**
 * Playlist Model
 *
 * Design Decisions:
 *
 * 1. videos ARRAY OF ObjectIds — not a sub-document array.
 *    Storing only ObjectIds keeps the playlist document lightweight regardless
 *    of how many videos it contains. Full video details are fetched via $lookup
 *    at read time. Sub-documents would duplicate video metadata (title, thumbnail)
 *    here and require updates across playlists whenever a video changes.
 *
 * 2. ORDERING SUPPORT (future-proof):
 *    Array position IS the order. MongoDB preserves array insertion order.
 *    $push appends to end (default add behavior).
 *    $pull removes by value without shifting other positions incorrectly.
 *    Future reorder endpoint can use $set: { videos: newOrderedArray } to
 *    persist a drag-and-drop reorder from the frontend — no schema change needed.
 *
 * 3. DUPLICATE PREVENTION:
 *    NOT enforced via $addToSet at the model level — enforced in the service.
 *    Reason: $addToSet silently ignores duplicates with no error or feedback.
 *    The service explicitly checks and throws ApiError(409) so the frontend
 *    receives a meaningful error message ("Video already in playlist").
 *
 * 4. thumbnail IS OPTIONAL.
 *    Auto-generated from first video's thumbnail in service at read time.
 *    Owners can override with a custom thumbnail (future upload feature).
 *    Storing null by default avoids a required-field problem on empty playlists.
 *
 * 5. visibility "public" | "private" — string enum over boolean.
 *    Boolean (isPrivate) cannot accommodate future states like "unlisted"
 *    (viewable by link, not listed publicly) which YouTube supports.
 *    String enum extends without a schema migration.
 *
 * 6. NO videoCount FIELD.
 *    videos.length at read time is O(1) from the already-loaded array.
 *    A stored counter would require $inc on every add/remove — write overhead
 *    for zero benefit when the array is already in the document.
 *
 * INDEXES:
 *    { owner, createdAt } → "my playlists" page, sorted newest first.
 *    { owner, visibility } → "public playlists by user" filtered query.
 *    No index on videos array — playlist video queries go through
 *    the playlist document itself, not a direct video lookup on this collection.
 *
 * FUTURE MODULES:
 *    Dashboard → countDocuments({ owner: userId }) for playlist analytics.
 *    Recommendations → join Playlist + WatchSession to surface unwatched
 *    playlist videos.
 */

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Playlist name is required"],
            trim: true,
            maxlength: [150, "Playlist name cannot exceed 150 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"],
            default: "",
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Playlist owner is required"],
            index: true,
        },
        /**
         * Ordered array of video references.
         * Array position = display order.
         * Future reorder: replace entire array via $set.
         */
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        /**
         * Optional custom thumbnail URL (Cloudinary).
         * If null, frontend derives thumbnail from first video in the array.
         */
        thumbnail: {
            type: String,
            default: null,
        },
        /**
         * "public"   → visible to everyone, listed on channel page
         * "private"  → visible only to owner
         * "unlisted" → accessible by link, not listed (future)
         */
        visibility: {
            type: String,
            enum: {
                values: ["public", "private"],
                message: 'Visibility must be "public" or "private"',
            },
            default: "public",
        },
    },
    {
        timestamps: true,
    }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * "My Playlists" page: all playlists by owner, newest first.
 * Also serves as partial index for ownership checks in update/delete.
 */
playlistSchema.index({ owner: 1, createdAt: -1 });

/**
 * "Public playlists by user" — channel page tab.
 * Filters by owner + visibility without a collection scan.
 */
playlistSchema.index({ owner: 1, visibility: 1 });

const Playlist = mongoose.model("Playlist", playlistSchema);

export default Playlist;