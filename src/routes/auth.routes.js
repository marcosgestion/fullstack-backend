import express from "express";
import { login, register } from "../controllers/auth.controller.js"; // Asumiendo que tu controlador tiene la función register
import { bruteForceMiddleware } from "../middlewares/bruteForce.middleware.js";

const router = express.Router();

router.post("/login", bruteForceMiddleware, login);
router.post("/register", register); // Endpoint público sin authMiddleware

export default router;