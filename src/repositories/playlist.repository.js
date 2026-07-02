import mongoose from "mongoose";
import Playlist from "../models/playlist.model.js";

/**
 * PlaylistRepository
 *
 * Every query against the Playlist collection lives here.
 * Zero business logic — ownership checks, privacy validation,
 * duplicate prevention all belong in PlaylistService.
 */

class PlaylistRepository {

    // ── Core CRUD ─────────────────────────────────────────────────────────────

    /**
     * Create a new playlist document.
     * Videos array starts empty — videos are added via addVideo().
     */
    async create({ name, description, owner, visibility }) {
        return await Playlist.create({
            name,
            description,
            owner: new mongoose.Types.ObjectId(owner),
            visibility,
            videos: [],
        });
    }

    /**
     * Update mutable playlist fields: name, description, thumbnail.
     * Visibility has its own dedicated method (changeVisibility) to
     * keep the audit trail clean and match the dedicated PATCH route.
     * runValidators: true — enforces maxlength and enum rules on update.
     */
    async update(playlistId, { name, description, thumbnail }) {
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (thumbnail !== undefined) updates.thumbnail = thumbnail;

        return await Playlist.findByIdAndUpdate(
            playlistId,
            { $set: updates },
            { new: true, runValidators: true }
        );
    }

    /**
     * Hard delete a playlist document.
     * Does NOT delete the videos themselves — only the playlist.
     * Video documents in the Video collection are untouched.
     */
    async deleteById(playlistId) {
        return await Playlist.findByIdAndDelete(playlistId);
    }

    /**
     * Find a playlist by ID.
     * Raw document returned — service decides whether to populate.
     * Separate populated fetch (getPlaylistWithVideos) used for detail page.
     */
    async findById(playlistId) {
        return await Playlist.findById(playlistId);
    }

    /**
     * Get full playlist detail with populated videos and owner.
     *
     * Aggregation pipeline:
     * Stage 1 — $match by playlistId
     * Stage 2 — $lookup videos: join Video collection, filter published only,
     *            project only card-level fields to keep payload small.
     * Stage 3 — $lookup owner: join User for owner name + avatar.
     * Stage 4 — $addFields: flatten owner array + compute videoCount.
     * Stage 5 — $project: exclude internal fields from response.
     *
     * Why aggregation instead of .populate()?
     * populate() fetches all videos including deleted/unpublished.
     * Aggregation lets us filter { status: "published" } inside the $lookup
     * pipeline — deleted or private videos are silently excluded.
     * This is the correct behavior: playlist shows only watchable videos.
     */
    async getPlaylistWithVideos(playlistId) {
        const result = await Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId),
                },
            },
            // Join published videos, preserving array order
            {
                $lookup: {
                    from: "videos",
                    let: { videoIds: "$videos" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$videoIds"] },
                                        { $eq: ["$status", "published"] },
                                    ],
                                },
                            },
                        },
                        // Join owner of each video
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
                        {
                            $addFields: {
                                owner: { $first: "$owner" },
                            },
                        },
                        {
                            $project: {
                                title: 1,
                                thumbnail: 1,
                                duration: 1,
                                views: 1,
                                owner: 1,
                                createdAt: 1,
                                status: 1,
                            },
                        },
                    ],
                    as: "videos",
                },
            },
            // Join playlist owner
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
            {
                $addFields: {
                    owner: { $first: "$owner" },
                    videoCount: { $size: "$videos" },
                },
            },
        ]);

        return result[0] || null;
    }

    // ── User Playlist Queries ─────────────────────────────────────────────────

    /**
     * All playlists owned by a user (for "My Playlists" page).
     * Returns all visibility types — ownership already verified in service.
     * Lightweight: does not populate full video details,
     * only derives thumbnail from first video for the playlist card.
     */
    async getUserPlaylists(userId, page, limit) {
        const skip = (page - 1) * limit;

        const [playlists, total] = await Promise.all([
            Playlist.find({ owner: new mongoose.Types.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "videos",
                    match: { status: "published" },
                    select: "thumbnail",
                    options: { limit: 1 }, // only first video for card thumbnail
                })
                .lean(),

            Playlist.countDocuments({
                owner: new mongoose.Types.ObjectId(userId),
            }),
        ]);

        return { playlists, total };
    }

    /**
     * Public playlists of any user (for channel page "Playlists" tab).
     * Strictly filters visibility: "public" — private playlists never exposed.
     */
    async getPublicPlaylists(userId, page, limit) {
        const skip = (page - 1) * limit;

        const [playlists, total] = await Promise.all([
            Playlist.find({
                owner: new mongoose.Types.ObjectId(userId),
                visibility: "public",
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "videos",
                    match: { status: "published" },
                    select: "thumbnail",
                    options: { limit: 1 },
                })
                .lean(),

            Playlist.countDocuments({
                owner: new mongoose.Types.ObjectId(userId),
                visibility: "public",
            }),
        ]);

        return { playlists, total };
    }

    // ── Video Management ──────────────────────────────────────────────────────

    /**
     * Add a videoId to the videos array.
     * Uses $push (not $addToSet) — duplicate prevention is in the service
     * layer so we can return a meaningful error instead of silent no-op.
     * $push preserves insertion order for future reordering.
     */
    async addVideo(playlistId, videoId) {
        return await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $push: { videos: new mongoose.Types.ObjectId(videoId) },
            },
            { new: true }
        );
    }

    /**
     * Remove a videoId from the videos array.
     * $pull removes all occurrences of the value (handles any legacy duplicates).
     */
    async removeVideo(playlistId, videoId) {
        return await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $pull: { videos: new mongoose.Types.ObjectId(videoId) },
            },
            { new: true }
        );
    }

    // ── Visibility ────────────────────────────────────────────────────────────

    /**
     * Update playlist visibility.
     * Separate from update() to match the dedicated PATCH /visibility route
     * and make the intent explicit in the call chain.
     */
    async changeVisibility(playlistId, visibility) {
        return await Playlist.findByIdAndUpdate(
            playlistId,
            { $set: { visibility } },
            { new: true, runValidators: true }
        );
    }

    // ── Cascade Helpers (called by Video module on video delete) ──────────────

    /**
     * Remove a videoId from ALL playlists that contain it.
     * Called when a video is hard-deleted so no playlist holds a dead reference.
     * updateMany is atomic per-document in MongoDB.
     */
    async removeVideoFromAllPlaylists(videoId) {
        return await Playlist.updateMany(
            { videos: new mongoose.Types.ObjectId(videoId) },
            { $pull: { videos: new mongoose.Types.ObjectId(videoId) } }
        );
    }
}

export default new PlaylistRepository();