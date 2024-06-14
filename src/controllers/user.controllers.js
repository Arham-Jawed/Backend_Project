import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import { uploadOnCloud } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

  let coverimageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.lenght > 0
  ) {
    coverimageLocalPath = req.files.coverImage[0].path;
  } else {
    coverimageLocalPath = "";
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Is required");
  }

  //upload them to cloud, avatar checkup

  const avatar = await uploadOnCloud(avatarLocalPath);
  const coverImage = await uploadOnCloud(coverimageLocalPath);

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

export { registerUser, loginUser, logoutUser };
