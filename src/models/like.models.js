import mongoose, { Mongoose , Schema } from "mongoose";

const likesSchema = new Schema({
    comments : {
        type : Schema.Types.ObjectId,
        ref : "Comment"
    },
    video : {
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    likedBy : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    tweet : {
        type : Schema.Types.ObjectId,
        ref : "Tweets"
    },
},{timestamps : true})

const Like = mongoose.model("Like", likesSchema)

export default Like;