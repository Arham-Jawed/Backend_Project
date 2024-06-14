import {v2 as cloud} from "cloudinary"
import fs from "fs"

cloud.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const uploadOnCloud = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const response = await cloud.uploader.upload(localFilePath,{
            resource_type : "auto"
        })
        // console.log("File Is Uploaded Successfully On Cloud ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}

export { uploadOnCloud }