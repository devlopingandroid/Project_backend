import mongoose, { Schema } from "mongoose";

/**
 * Comment Model
 *
 * Supports:
 * 1. Comments on videos
 * 2. Nested replies
 * 3. Owner authorization
 * 4. Dashboard analytics
 * 5. Like module integration
 *
 * Design Decisions
 * ----------------
 * • Every comment belongs to one video.
 * • Every comment belongs to one owner.
 * • Replies are also comments.
 * • parentComment = null → root comment
 * • parentComment != null → reply
 *
 * replyCount is stored to avoid expensive COUNT queries every request.
 *
 * Like counts are NOT stored here.
 * Like Module remains the single source of truth.
 */

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 1000,
        },

        owner: {
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

        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },

        replyCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        isEdited: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Indexes
 */

// Root comments of a video
commentSchema.index({
    video: 1,
    parentComment: 1,
    createdAt: -1,
});

// Replies
commentSchema.index({
    parentComment: 1,
    createdAt: 1,
});

// Owner queries
commentSchema.index({
    owner: 1,
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;