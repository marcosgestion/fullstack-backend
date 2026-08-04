import { successResponse, errorResponse } from "../helpers/response.helper.js";
import { loginService, registerService } from "../services/auth.service.js";

const login = async (req, res) => {
  try {
    const response = await loginService(req.body);
    successResponse(res, response, "Login exitoso");
  } catch (error) {
    errorResponse(res, error.message, error.statusCode);
  }
};

const register = async (req, res) => {
  try {
    const response = await registerService(req.body);
    successResponse(res, response, "Usuario registrado con éxito", 201);
  } catch (error) {
    errorResponse(res, error.message, error.statusCode || 500);
  }
};

export { login, register };