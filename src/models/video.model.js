import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

/**
 * Video Model
 *
 * Design Decisions:
 * - videoFile and thumbnail store Cloudinary URLs (not local paths)
 * - duration stored in seconds (Number) for flexible frontend formatting
 * - views tracked here; likes tracked separately in Like model (normalized)
 * - isPublished flag controls visibility; soft-delete via isPublished=false
 * - owner ref to User enables channel-level video aggregation
 * - mongooseAggregatePaginate enables cursor/page-based pagination on
 *   complex aggregation pipelines (needed for feed, search, channel videos)
 */

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,      // Cloudinary URL
            required: [true, "Video file is required"],
        },
        thumbnail: {
            type: String,      // Cloudinary URL
            required: [true, "Thumbnail is required"],
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [100, "Title cannot exceed 100 characters"],
            index: "text",     // enables $text search on title
        },
        description: {
            type: String,
            trim: true,
            maxlength: [5000, "Description cannot exceed 5000 characters"],
            default: "",
            index: "text",     // enables $text search on description
        },
        duration: {
            type: Number,      // seconds, from Cloudinary response
            required: [true, "Duration is required"],
            min: [0, "Duration cannot be negative"],
        },
        views: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
           type: String,
           enum: ["processing", "published", "private"],
           default: "processing",
           index: true,
},
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,       // channel page queries: videos by owner
        },
        // Cloudinary public_id stored separately so we can delete the file
        // from Cloudinary when video is deleted (not just URL)
        videoFilePublicId: {
            type: String,
            required: true,
        },
        thumbnailPublicId: {
            type: String,
            required: true,
        },
        // Optional: category tag for filtering (extend later)
        tags: {
            type: [String],
            default: [],
        },
        category: {
       type: String,
       trim: true,
       default: "General",
       index: true,
       },
       slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
     },
    },
    {
        timestamps: true,   // createdAt, updatedAt
    }
);

// Compound indexes for common query patterns
videoSchema.index({ owner: 1, createdAt: -1 });        // channel videos, newest first
videoSchema.index({
    status: 1,
    createdAt: -1,
});

videoSchema.index({
    status: 1,
    views: -1,
});
// Full-text search index on title + description
videoSchema.index({ title: "text", description: "text" });

// Pagination plugin — enables .aggregatePaginate() for complex pipelines
videoSchema.plugin(mongooseAggregatePaginate);

const Video = mongoose.model("Video", videoSchema);

export default Video;