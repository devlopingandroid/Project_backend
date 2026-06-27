import "./env.js";


import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`🚀 Server running at http://localhost:${process.env.PORT || 8000}`);
    });
})
.catch((err) => {
    console.error("MongoDB connection failed:", err);
});