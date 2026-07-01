import { body, query, param } from "express-validator";
import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * Video Validators
 *
 * Using express-validator for server-side validation.
 * Frontend has Zod — this is the backend's independent defence layer.
 * Never trust client-side validation alone.
 */

// Middleware to run after validator chains and throw on errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => e.msg).join(", ");
        throw new ApiError(422, messages);
    }
    next();
};

const validatePublishVideo = [
    body("title")
        .trim()
        .notEmpty().withMessage("Title is required")
        .isLength({ max: 100 }).withMessage("Title cannot exceed 100 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage("Description cannot exceed 5000 characters"),
    validate,
];

const validateUpdateVideo = [
    body("title")
        .optional()
        .trim()
        .notEmpty().withMessage("Title cannot be empty")
        .isLength({ max: 100 }).withMessage("Title cannot exceed 100 characters"),
    body("description")
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage("Description too long"),
    validate,
];

const validateGetAllVideos = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50")
        .toInt(),
    query("sortBy")
        .optional()
        .isIn(["createdAt", "views", "duration", "title"])
        .withMessage("Invalid sortBy field"),
    query("sortType")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("sortType must be asc or desc"),
    query("userId")
        .optional()
        .isMongoId().withMessage("Invalid userId format"),
    validate,
];

const validateVideoId = [
    param("videoId")
        .isMongoId().withMessage("Invalid video ID"),
    validate,
];

export {
    validatePublishVideo,
    validateUpdateVideo,
    validateGetAllVideos,
    validateVideoId,
};