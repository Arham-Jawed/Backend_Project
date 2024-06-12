import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"

const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`MongoDb Connected !! MongoDb Host Is : ${connectionInstance}`);
    } catch (error) {
        console.log(`MongoDb Connection Error : ${error}`);
        process.exit(1)
    }
}

export default connectDb;