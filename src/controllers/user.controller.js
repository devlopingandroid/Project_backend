import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {

    const { fullname, email,username, password } = req.body;
    console.log("Fullname:", fullname);

    if(
        [fullname,email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"Fullname is required");  
    }
    const existedUser= await User.findOne({$or:[{email},{username}]})
        if(existedUser){
            throw new ApiError(409,"User already exists");
        }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar and cover image are required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath?await uploadOnCloudinary(coverImageLocalPath): null;
    const newUser = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        username: username.toLowerCase(),   
        password,
})
    const createdUser = await User.findByIdAndUpdate(newUser._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"User not created");
    }
});
export { 
    registerUser, 
}