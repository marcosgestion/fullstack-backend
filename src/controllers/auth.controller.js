import { successResponse, errorResponse } from "../helpers/response.helper.js";
import { loginService, registerService } from "../services/auth.service.js";
import { registerFailedLogin } from "../middlewares/bruteForce.middleware.js";
import { registerSchema } from "../dto/user.dto.js";

const login = async (req, res) => {
  try {
    const response = await loginService(req.body);
    successResponse(res, response, "Login exitoso");
  } catch (error) {
    // Solo las credenciales inválidas cuentan como intento fallido para el limiter
    if (error.statusCode === 401 || error.statusCode === 404) {
      await registerFailedLogin(req);
    }
    errorResponse(res, error.message, error.statusCode);
  }
};

const register = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return errorResponse(res, "Error de validación", 400, error.details);
    }

    const response = await registerService(req.body);
    successResponse(res, response, "Usuario registrado con éxito", 201);
  } catch (error) {
    errorResponse(res, error.message, error.statusCode || 500);
  }
};

export { login, register };