import express from "express";
import "./config/env.js";
import connectDB from "./config/db.js";
import corsConfig from "./config/cors.js";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(corsConfig);
app.use(express.json());
connectDB();
app.use(userRoutes);
app.use("/auth", authRoutes);
app.listen(process.env.PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT}`);
});
