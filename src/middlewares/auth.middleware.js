import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // ===== DEBUG LOGS =====
    console.log("\n========== VERIFY JWT ==========");
    console.log("Request URL:", req.originalUrl);
    console.log("Method:", req.method);
    console.log("Cookies:", req.cookies);
    console.log("Authorization Header:", req.header("Authorization"));
    // =======================

    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("Extracted Token:", token);

    if (!token) {
      console.log("❌ No token found");
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    console.log("✅ Decoded Token:", decodedToken);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      console.log("❌ User not found");
      throw new ApiError(401, "Invalid Access Token");
    }

    console.log("✅ Authenticated User:", user._id);

    req.user = user;
    next();
  } catch (error) {
    console.log("❌ JWT Verification Error:", error.message);

    throw new ApiError(
      401,
      error?.message || "Invalid Access Token"
    );
  }
});