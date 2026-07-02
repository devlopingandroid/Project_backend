import { Router } from "express";
import {
    toggleSubscription,
    getSubscriptionStatus,
    getSubscribers,
    getSubscribedChannels,
    getSubscriptionFeed,
} from "../controllers/subscription.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
    validateChannelId,
    validatePagination,
} from "../validators/subscription.validator.js";

const router = Router();

// Protect all subscription routes
router.use(verifyJWT);

// Static Routes
router.get(
    "/channels",
    validatePagination,
    getSubscribedChannels
);

router.get(
    "/feed",
    validatePagination,
    getSubscriptionFeed
);

// Dynamic Routes
router.post(
    "/:channelId",
    validateChannelId,
    toggleSubscription
);

router.get(
    "/:channelId/status",
    validateChannelId,
    getSubscriptionStatus
);

router.get(
    "/:channelId/subscribers",
    validateChannelId,
    validatePagination,
    getSubscribers
);

export default router;