import { body, param, query } from "express-validator";
import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * WatchValidators
 *
 * Server-side validation — independent of frontend Zod schemas.
 * Always runs before the controller.
 */

const validate = (req, res, next) => {
    const errors = validationResult(req);

if (!errors.isEmpty()) {
    const firstError = errors.array({
        onlyFirstError: true,
    });

    throw new ApiError(
        422,
        firstError[0].msg
    );
}
    next();
};

const validateVideoIdParam = [
    param("videoId")
        .isMongoId()
        .withMessage("Invalid video ID"),
    validate,
];

const validateRecordSession = [
    param("videoId")
        .isMongoId()
        .withMessage("Invalid video ID"),
    body("progress")
    .exists()
    .withMessage("Progress is required")
    .isFloat({ min: 0 })
    .withMessage("Progress must be a non-negative number")
    .toFloat(),

    body("duration")
    .exists()
    .withMessage("Duration is required")
    .isFloat({ min: 1 })
    .withMessage("Duration must be greater than 0")
    .toFloat(),
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
    validateVideoIdParam,
    validateRecordSession,
    validatePagination,
};