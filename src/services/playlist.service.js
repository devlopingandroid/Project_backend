import playlistRepository from "../repositories/playlist.repository.js";
import ApiError from "../utils/ApiError.js";

/**
 * PlaylistService
 *
 * All business rules for the Playlist module.
 * Repository handles DB. Controller handles HTTP. This owns everything between.
 *
 * Ownership Rule (applied consistently):
 * Any mutation (update, delete, add video, remove video, change visibility)
 * requires playlist.owner.toString() === requestingUserId.toString().
 * This check always happens in service, never in controller or repository.
 */

class PlaylistService {

    /**
     * Create a new playlist.
     * Ownership is set to the requesting user — no override possible.
     */
    async createPlaylist({ name, description, visibility = "public" }, userId) {
        const playlist = await playlistRepository.create({
            name: name.trim(),
            description: description?.trim() || "",
            owner: userId,
            visibility,
        });

        return playlist;
    }

    /**
     * Update playlist metadata: name, description, thumbnail.
     * Visibility excluded — has its own dedicated method and route.
     */
    async updatePlaylist(playlistId, updates, userId) {
        const playlist = await this._getOwnedPlaylist(playlistId, userId);

        const updated = await playlistRepository.update(playlist._id, {
            name: updates.name?.trim(),
            description: updates.description?.trim(),
            thumbnail: updates.thumbnail,
        });

        return updated;
    }

    /**
     * Delete a playlist document.
     * Does NOT delete the videos themselves — playlists are containers.
     */
    async deletePlaylist(playlistId, userId) {
        const playlist = await this._getOwnedPlaylist(playlistId, userId);
        await playlistRepository.deleteById(playlist._id);
        return { deleted: true };
    }

    /**
     * Get full playlist detail with populated videos.
     *
     * Privacy logic:
     * - Public playlist → anyone can view.
     * - Private playlist → only owner can view. Others receive 403.
     *
     * requestingUserId can be null (unauthenticated request).
     */
    async getPlaylistById(playlistId, requestingUserId) {
        const playlist = await playlistRepository.getPlaylistWithVideos(
            playlistId
        );

        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }

        const isOwner =
            requestingUserId &&
            playlist.owner._id.toString() === requestingUserId.toString();

        if (playlist.visibility === "private" && !isOwner) {
            throw new ApiError(
                403,
                "This playlist is private"
            );
        }

        return playlist;
    }

    /**
     * Get all playlists owned by the requesting user.
     * Returns all visibility types (public + private) — own data only.
     */
    async getMyPlaylists(userId, page, limit) {
        this._validatePagination(page, limit);

        const { playlists, total } =
            await playlistRepository.getUserPlaylists(userId, page, limit);

        return this._buildPaginatedResponse(playlists, total, page, limit);
    }

    /**
     * Get public playlists of any user (for channel page).
     * Strictly public only — never exposes private playlists of another user.
     */
    async getPublicPlaylistsByUser(targetUserId, page, limit) {
        this._validatePagination(page, limit);

        const { playlists, total } =
            await playlistRepository.getPublicPlaylists(
                targetUserId,
                page,
                limit
            );

        return this._buildPaginatedResponse(playlists, total, page, limit);
    }

    /**
     * Add a video to a playlist.
     *
     * Rules:
     * 1. Only owner can add videos.
     * 2. Same video cannot appear twice in the same playlist.
     *    Explicit check + ApiError(409) instead of silent $addToSet.
     */
    async addVideoToPlaylist(playlistId, videoId, userId) {
        const playlist = await this._getOwnedPlaylist(playlistId, userId);

        // Rule 2: duplicate prevention
        const alreadyExists = playlist.videos.some(
            (id) => id.toString() === videoId.toString()
        );

        if (alreadyExists) {
            throw new ApiError(409, "Video is already in this playlist");
        }

        const updated = await playlistRepository.addVideo(
            playlist._id,
            videoId
        );

        return updated;
    }

    /**
     * Remove a video from a playlist.
     *
     * Rules:
     * 1. Only owner can remove videos.
     * 2. Video must actually be in the playlist — return 404 if not.
     */
    async removeVideoFromPlaylist(playlistId, videoId, userId) {
        const playlist = await this._getOwnedPlaylist(playlistId, userId);

        const exists = playlist.videos.some(
            (id) => id.toString() === videoId.toString()
        );

        if (!exists) {
            throw new ApiError(404, "Video not found in this playlist");
        }

        const updated = await playlistRepository.removeVideo(
            playlist._id,
            videoId
        );

        return updated;
    }

    /**
     * Change playlist visibility between "public" and "private".
     * Only owner can change visibility.
     */
    async changeVisibility(playlistId, visibility, userId) {
        await this._getOwnedPlaylist(playlistId, userId);

        const updated = await playlistRepository.changeVisibility(
            playlistId,
            visibility
        );

        return updated;
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Fetch a playlist and verify the requesting user is the owner.
     * Used by every mutation method to eliminate repeated boilerplate.
     *
     * Throws:
     * - 404 if playlist does not exist
     * - 403 if requesting user is not the owner
     *
     * Returns the raw playlist document on success.
     */
    async _getOwnedPlaylist(playlistId, userId) {
        const playlist = await playlistRepository.findById(playlistId);

        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }

        if (playlist.owner.toString() !== userId.toString()) {
            throw new ApiError(
                403,
                "You are not authorized to modify this playlist"
            );
        }

        return playlist;
    }

    _validatePagination(page, limit) {
        if (page < 1) throw new ApiError(400, "Page must be at least 1");
        if (limit < 1 || limit > 50)
            throw new ApiError(400, "Limit must be between 1 and 50");
    }

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

export default new PlaylistService();