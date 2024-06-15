import mongoose, { Schema } from "mongoose";

const userSubscription = new Schema({
    subscriber : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    channel : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }
},{timestamps : true})


const Subscription = mongoose.model("Subscription" , userSubscription);

export default Subcription;