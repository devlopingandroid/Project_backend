import mongoose, { Schema } from "mongoose";

/**
 * Like Model
 *
 * Supports:
 * - Video Likes
 * - Comment Likes
 *
 * Rules:
 * 1. A Like belongs to exactly one user.
 * 2. A Like targets either ONE Video OR ONE Comment.
 * 3. One user can like a particular video/comment only once.
 */

const likeSchema = new Schema(
    {
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            default: null,
        },

        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Validation
 * Exactly one target must exist.
 */
likeSchema.pre("validate", function () {
    const hasVideo = this.video != null;
    const hasComment = this.comment != null;

    if (hasVideo === hasComment) {
        throw new Error(
            "A like must belong to either a video or a comment."
        );
    }
});

/**
 * ------------------------------------------------------------------
 * Compound Unique Indexes
 * ------------------------------------------------------------------
 */

// One user → one like per video
likeSchema.index(
    {
        likedBy: 1,
        video: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            video: {
                $type: "objectId",
            },
        },
    }
);

// One user → one like per comment
likeSchema.index(
    {
        likedBy: 1,
        comment: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            comment: {
                $type: "objectId",
            },
        },
    }
);

/**
 * ------------------------------------------------------------------
 * Query Indexes
 * ------------------------------------------------------------------
 */

likeSchema.index({ video: 1 });
likeSchema.index({ comment: 1 });

const Like = mongoose.model("Like", likeSchema);

export default Like;