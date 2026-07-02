import { body, param, query } from "express-validator";
import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(422, errors.array()[0].msg);
    }
    next();
};

const validateCreatePlaylist = [
    body("name")
        .trim()
        .notEmpty().withMessage("Playlist name is required")
        .isLength({ max: 150 }).withMessage("Name cannot exceed 150 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage("Description cannot exceed 2000 characters"),
    body("visibility")
        .optional()
        .isIn(["public", "private"]).withMessage('Visibility must be "public" or "private"'),
    validate,
];

const validateUpdatePlaylist = [
    param("playlistId")
        .isMongoId().withMessage("Invalid playlist ID"),
    body("name")
        .optional()
        .trim()
        .notEmpty().withMessage("Name cannot be empty")
        .isLength({ max: 150 }).withMessage("Name cannot exceed 150 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage("Description cannot exceed 2000 characters"),
    validate,
];

const validatePlaylistId = [
    param("playlistId")
        .isMongoId().withMessage("Invalid playlist ID"),
    validate,
];

const validatePlaylistAndVideoId = [
    param("playlistId")
        .isMongoId().withMessage("Invalid playlist ID"),
    param("videoId")
        .isMongoId().withMessage("Invalid video ID"),
    validate,
];

const validateUserId = [
    param("userId")
        .isMongoId().withMessage("Invalid user ID"),
    validate,
];

const validateVisibility = [
    param("playlistId")
        .isMongoId().withMessage("Invalid playlist ID"),
    body("visibility")
        .notEmpty().withMessage("Visibility is required")
        .isIn(["public", "private"]).withMessage('Visibility must be "public" or "private"'),
    validate,
];

const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50")
        .toInt(),
    validate,
];

export {
    validateCreatePlaylist,
    validateUpdatePlaylist,
    validatePlaylistId,
    validatePlaylistAndVideoId,
    validateUserId,
    validateVisibility,
    validatePagination,
};