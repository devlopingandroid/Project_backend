import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

  const generateAccessAndRefreshTokens= async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();      
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return{accessToken,refreshToken}
    }catch(error){
        throw new ApiError(500,"Something went wrong")
    }
}
  const registerUser = asyncHandler(async (req, res) => {

    console.log("========== REGISTER REQUEST ==========");
    console.log("BODY =>", req.body);
    console.log("FILES =>", req.files);

    // Temporary Debug Check
    if (!req.body) {
        return res.status(400).json({
            success: false,
            message: "req.body is undefined",
            body: req.body,
            files: req.files
        });
    }

    const { fullname, email, username, password } = req.body;

    if (
        [fullname, email, username, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "User registered successfully"
        )
    );
})

 const loginUser = asyncHandler(async (req, res) => {
    const { email,username, password } = req.body;

    if(!(username||email)){
        throw new ApiError(400,"Username or email  are required");
    }


    if (!password) {
         throw new ApiError(400, "Password is required");
    }

    const user= await User.findOne({
    $or : [{username},{email}]
    })
    
    if(!user){
        throw new ApiError(404,"USer doesn't exist");
    }

     const isPasswordValid = await user.isPasswordCorrect(password);

     if(!isPasswordValid){
        throw new ApiError(401,"Invalid password");
     }

     const{accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

     const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
}
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,
                refreshToken
            },
            "User loggeed IN Sucessfully"
        )
     )


 })

 const logOutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken:undefined
            }
        },{
            new:true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
   return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
 })

 const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.
    refreshToken||req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }
try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
            if(!user){
            throw new ApiError(401,"Invalid Refresh Token ")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh tokein is expired")
        }
        const options ={
            httpOnly:true,
            secure: true
        }
        const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)
    
         return res
         .status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refreshToken",refreshToken,options)
         .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken},
                "Access Token Refreshed"
            )
         )
    
} catch (error) {
    throw new ApiError(401,error?.message||"Invalid refresh token")
} }) 

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword,confirmPassword}=req.body
    if(!(newPassword===confirmPassword)){
        throw new ApiError(400,"Password doesn't match.")
    }
    const user = await User.findById(req.user?.id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Entered wrong password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed Successfully"))


})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched Successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{  
    const {fullname}=req.body
    if(!fullname){
        throw new ApiError(400,"Field is required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading on avatar")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")
        return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully."))
    
})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading on cover image")
    }

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"CoverImage  updated successfully."))
    
})
const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing.")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"Subscriptions",
                localField: "_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"Subscriptions",
                localField: "_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if : {$in:[req.user?._id,"$subscribers.subscriber"]},
                        then : true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }

    ])
    if(!channel?.length){
        throw new ApiError(404,"channel doesn't exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User Channel fetched Successfully")
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const watchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            let: {
                                ownerId: "$owner",
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$_id", "$$ownerId"],
                                        },
                                    },
                                },
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                            as: "owner",
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            watchHistory[0]?.watchHistory || [],
            "Watch history fetched successfully"
        )
    );
})

export {
    registerUser,
    loginUser,
    logOutUser,
    changeCurrentPassword,
    getCurrentUser,
    refreshAccessToken,
    updateAvatar,
    updateAccountDetails,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
};