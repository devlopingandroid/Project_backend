import dotenv from "dotenv";
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import connectDB from "./db/index.js";  

dotenv.config({
    path: './.env'
})
console.log(process.env.MONGO_URI);
connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000)
})
.catch((err)=>{
    console.log("Mongo db connection failed!!! ",err);
})