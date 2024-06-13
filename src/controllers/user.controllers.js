import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import User  from "../models/user.models.js"
import { uploadOnCloud } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req,res) => {
    // get user detailes from frontend

    const {username,email,password,fullName} = req.body

    //validation - not empty

    if(
        [email,username,fullName,password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All Fields Are Required To Be Filled")
    }
    if(!email.includes("@")){
        throw new ApiError(400, "Email Should contain @")
    }

    //check if the user already exist : username and email should be unique

    const existedUser = User.findOne({
        $or : [{ email },{ username }]
    })

    if(existedUser){
        throw new ApiError(409, "The User With the Same Username Or Email Is Already Exist")
    }

    //check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverimageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar Is required")
    }

    //upload them to cloud, avatar checkup

    const avatar = await uploadOnCloud(avatarLocalPath)
    const coverImage = await uploadOnCloud(coverimageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Provide Avatar Properly")
    }

    //create user object - create entry in db

    const user = await User.create({
        username,
        fullName,
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",     
    })

    //remove password and refreshToken feild from response to the user

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //check for user creation 

    if(!createdUser){
        throw new ApiError(500, "Something Went Wrong While Registering A User")
    }   

    //return response

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Created Successfully")
    )
})

export {registerUser}
