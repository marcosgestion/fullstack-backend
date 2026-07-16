import dotenv from "dotenv";

dotenv.config();
const requiredVariables = ["PORT", "MONGO_URI", "JWT_SECRET", "JWT_EXPIRES_IN", "FRONTEND_URLS"];

requiredVariables.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`❌ La variable de entorno ${variable} no está definida`);
  }
});

console.log("✅ Variables de entorno cargadas");

export const env = {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  FRONTEND_URLS: process.env.FRONTEND_URLS,
};


