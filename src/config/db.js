import mongoose from "mongoose";
import { env } from "./env.js";

const connectDB = async () => {
  try {
    console.log("🔄 Conectando MongoDB...");
    await mongoose.connect(env.MONGO_URI);
    console.log("✅ MongoDB conectado correctamente");
  } catch (error) {
    console.log("❌ Error conectando MongoDB");
    console.log(error);
  }
};

export default connectDB;
