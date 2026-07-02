import { param, query, validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new ApiError(422, errors.array()[0].msg);
    }

    next();
};

const validateChannelId = [
    param("channelId")
        .isMongoId()
        .withMessage("Invalid channel ID"),
    validate,
];

const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50")
        .toInt(),

    validate,
];

export {
    validateChannelId,
    validatePagination,
};