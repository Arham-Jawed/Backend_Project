import {v2 as cloud} from "cloudinary"
import { ApiError } from "./ApiError"

cloud.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const deleteFromCloud = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        await cloud.uploader.destroy(localFilePath)
    } catch (error) {
        throw new ApiError(500, "Error While Fetching Cloud",error?.message)
    }
}

export { deleteFromCloud }