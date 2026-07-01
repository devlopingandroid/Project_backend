import { param, query, validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * --------------------------------------------------------------------------
 * Common Validation Handler
 * --------------------------------------------------------------------------
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
 * --------------------------------------------------------------------------
 * Validate Video ID
 * --------------------------------------------------------------------------
 */
const validateVideoIdParam = [
    param("videoId")
        .isMongoId()
        .withMessage("Invalid video ID"),

    validate,
];

/**
 * --------------------------------------------------------------------------
 * Validate Comment ID
 * --------------------------------------------------------------------------
 */
const validateCommentIdParam = [
    param("commentId")
        .isMongoId()
        .withMessage("Invalid comment ID"),

    validate,
];

/**
 * --------------------------------------------------------------------------
 * Pagination Validation
 * --------------------------------------------------------------------------
 */
const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be greater than or equal to 1")
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
    validatePagination,
};