import express from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

// Se suma "GUEST" para que puedan cargar la vista del Home (viéndose a sí mismos)
router.get("/users", authMiddleware, authorizeRoles("ROOT", "ADMIN", "USER", "GUEST"), getUsers);

router.post("/users", authMiddleware, authorizeRoles("ROOT", "ADMIN"), createUser);

// Se suma "GUEST" para que puedan editar su propio perfil (campos no críticos)
router.put("/users/:id", authMiddleware, authorizeRoles("ROOT", "ADMIN", "USER", "GUEST"), updateUser);

router.delete("/users/:id", authMiddleware, authorizeRoles("ROOT", "ADMIN"), deleteUser);

export default router;