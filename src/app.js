import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"
import { LIMITED_SIZE } from "./constants.js"

const app = express();

app.use(express.json({limit : LIMITED_SIZE}))
app.use(express.urlencoded({extended : true, limit : LIMITED_SIZE}))
app.use(express.static("public"))
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true,
}))
app.use(cookieParser())



export default app;