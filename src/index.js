import dotenv from "dotenv"
dotenv.config()
import connectDB from "./db/index.js"

connectDB()










































// import express from "express"
// const app = express()
// ;( async ()  => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("Error", (error) => {
//             console.log(`ERROR : The Application Can't Fetch The Db ${error}`);
//             throw error
//         })
//         app.listen(process.env.PORT || 8000, () => {
//             console.log(`The Application Is Listening On PORT : ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.log(`ERROR : Can't Connect To Database ${error}`);
//         throw error
//     }
// })()