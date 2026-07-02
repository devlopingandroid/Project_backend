import playlistService from "../services/playlist.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * PlaylistController
 * Thin by design — extract, call service, respond.
 */

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, visibility } = req.body;

    const playlist = await playlistService.createPlaylist(
        { name, description, visibility },
        req.user._id
    );

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description, thumbnail } = req.body;

    const playlist = await playlistService.updatePlaylist(
        playlistId,
        { name, description, thumbnail },
        req.user._id
    );

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const result = await playlistService.deletePlaylist(
        playlistId,
        req.user._id
    );

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Playlist deleted successfully"));
});

/**
 * GET /playlists/:playlistId
 * Auth optional — needed to determine ownership for private playlist access.
 * req.user may be undefined if not authenticated.
 */
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await playlistService.getPlaylistById(
        playlistId,
        req.user?._id ?? null
    );

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const getMyPlaylists = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await playlistService.getMyPlaylists(
        req.user._id,
        page,
        limit
    );

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Your playlists fetched"));
});

const getPublicPlaylistsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await playlistService.getPublicPlaylistsByUser(
        userId,
        page,
        limit
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, result, "User playlists fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    const playlist = await playlistService.addVideoToPlaylist(
        playlistId,
        videoId,
        req.user._id
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Video added to playlist successfully")
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    const playlist = await playlistService.removeVideoFromPlaylist(
        playlistId,
        videoId,
        req.user._id
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Video removed from playlist successfully"
            )
        );
});

const changeVisibility = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { visibility } = req.body;

    const playlist = await playlistService.changeVisibility(
        playlistId,
        visibility,
        req.user._id
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                `Playlist is now ${playlist.visibility}`
            )
        );
});

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylistById,
    getMyPlaylists,
    getPublicPlaylistsByUser,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    changeVisibility,
};