import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import commentRouter from "./routes/comment.routes.js";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import watchRouter from "./routes/watch.routes.js";
import likeRouter from "./routes/like.routes.js";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}));

app.use(express.static("public"));
app.use(cookieParser());

console.log("✅ userRouter =", userRouter);

app.use("/users", userRouter);
app.use("/videos", videoRouter);
app.use("/watch", watchRouter);
app.use("/likes", likeRouter);
app.use("/comments", commentRouter);
export { app };