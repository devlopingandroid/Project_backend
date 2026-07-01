import { body, param, query, validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * Common Validation Handler
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError(
            422,
            errors.array({ onlyFirstError: true })[0].msg
        );
    }

    next();
};

/**
 * ------------------------------------------------------------------------
 * Validate Video ID
 * ------------------------------------------------------------------------
 */
const validateVideoIdParam = [
    param("videoId")
        .isMongoId()
        .withMessage("Invalid video ID"),

    validate,
];

/**
 * ------------------------------------------------------------------------
 * Validate Comment ID
 * ------------------------------------------------------------------------
 */
const validateCommentIdParam = [
    param("commentId")
        .isMongoId()
        .withMessage("Invalid comment ID"),

    validate,
];

/**
 * ------------------------------------------------------------------------
 * Validate Create / Update Comment
 * ------------------------------------------------------------------------
 */
const validateCommentContent = [
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Comment content is required")
        .isLength({ min: 1, max: 1000 })
        .withMessage("Comment must be between 1 and 1000 characters"),

    validate,
];

/**
 * ------------------------------------------------------------------------
 * Validate Pagination
 * ------------------------------------------------------------------------
 */
const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50")
        .toInt(),

    validate,
];

export {
    validateVideoIdParam,
    validateCommentIdParam,
    validateCommentContent,
    validatePagination,
};