import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import { uploadOnCloud } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { deleteFromCloud } from "../utils/Cloudinary.delete.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something Went Wrong On Generating Refresh Tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user detailes from frontend

  const { username, email, password, fullName } = req.body;

  //validation - not empty

  if (
    [email, username, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields Are Required To Be Filled");
  }
  if (!email.includes("@")) {
    throw new ApiError(400, "Email Should contain @");
  }

  //check if the user already exist : username and email should be unique

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "The User With the Same Username Or Email Is Already Exist"
    );
  }

  //check for images, check for avatar

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverimageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  console.log(coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Is required");
  }

  //upload them to cloud, avatar checkup

  const avatar = await uploadOnCloud(avatarLocalPath);
  const coverImage = await uploadOnCloud(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Provide Avatar Properly");
  }

  //create user object - create entry in db

  const user = await User.create({
    username,
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  //remove password and refreshToken feild from response to the user

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check for user creation

  if (!createdUser) {
    throw new ApiError(500, "Something Went Wrong While Registering A User");
  }

  //return response

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Created Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // User Se Data Lenge
  // Validation Krnge Ki Koi Field Empty toh Nhi
  // User Ke Diye Input Ko Db Wale Data Se Compare Krnge
  // Agr Same Data Nhi Hai Toh Error Pass Krnge
  // Agr Same Data Hai Toh Usko Refresh Token Or Access Token Provide Krnge
  // Or Phir Login Kr Denge

  const { email, username, password } = req.body;

  if (!(email || !username)) {
    throw new ApiError(400, "Please Enter Atlest One Either username or email");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User Doesn't Exist");
  }

  const isPasswordCorrect = await user.isPasswordvalid(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Password Is Incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Succesfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Succesfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingToken) {
      throw new ApiError(401, "Unauthorized Request");
    }

    const decodeToken = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodeToken) {
      throw new ApiError(401, "Refresh Token Is Expired Or Used");
    }

    const user = await User.findById(decodeToken?._id);

    if (!user) {
      throw new ApiError(401, "Unauthorized Refresh Token");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Refresh Token is Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized Request");
  }
  const isPasswordCorrect = await user.isPasswordvalid(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Password Is Incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Has Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetched Successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(401, "All Fields Are Required To Be Filled");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Updation Of User Is Successfully Done"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(401, "Avatar Path Is Missing");
  }


  const avatar = await uploadOnCloud(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error While Uploading Avatar On Cloud");
  }

  deleteFromCloud(avatarLocalPath)

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar Is Updated Succesfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(401, "coverImage Path Is Missing");
  }

  const coverImage = await uploadOnCloud(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(400, "Error While Uploading coverImage On Cloud");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User coverImage Is Updated Succesfully"));
});

const getUserChannelProfile = asyncHandler( async (req,res) => {
  const { username } = req.params
  if(!username?.trim()){
    throw new ApiError(401, "Username Is Missing")
  }
  const channel = await User.aggregate([
    {
      $match : {
        username : username?.toLowerCase()
      }
    },
    {
      $lookup : {
        from : "subscriptions",
        localField : "_id",
        foreignField : "channel",
        as : "subscribers"
      }
    },
    {
      $lookup : {
        from : "subscriptions",
        localField : "_id",
        foreignField : "subscriber",
        as : "subscribedTo"
      }
    },
    {
      $addFields : {
        subscribersCount : {
          $size : "$subscribers"
        },
        channelsSubscribedToCount : {
          $size : "$subscribedTo"
        },
        isSubscribed : {
          $cond : {
            if : {$in : [req.user?._id, "$subscribers.subscriber"]},
            then : true,
            else : false
          }
        }
      }
    },
    {
      $project : {
        fullName : 1,
        username : 1,
        subscribersCount : 1,
        channelsSubscribedToCount : 1,
        avatar : 1,
        coverImage : 1,
        isSubscribed : 1,
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404, "Channel Doesn't Exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0],"User Channel Fetched Successfully")
  )
})

const userWatchHistory = asyncHandler( async (req,res) => {
  const user = await User.aggregate([
    {
      $match : {
        _id : new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup : {
        from : 'videos',
        localField : "watchHistory",
        foreignField : "_id",
        as : "watchHistory",
        pipeline : [
          {
            $lookup : {
              from : "users",
              localField : "owner",
              foreignField : "_id",
              as : "owner",
              pipeline : [
                {
                  $project : {
                    fullName : 1,
                    username : 1,
                    avatar : 1,
                  }
                }
              ]
            }
          },
          {
            $addFields : {
              owner : {
                $first : "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200, user[0].watchHistory , "User Watch History Fetched Successfully" )
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  userWatchHistory,
};
