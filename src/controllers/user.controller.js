import { createUserSchema, updateUserSchema, userParamsSchema } from "../dto/user.dto.js";
import { getUsersService, createUserService, updateUserService, deleteUserService } from "../services/user.service.js";
import { successResponse, errorResponse, forbiddenResponse } from "../helpers/response.helper.js";

const getUsers = async (req, res) => {
  try {
    const { email, id } = req.query;
    
    const users = await getUsersService({
      email,
      id,
      requesterRole: req.user?.role,
      requesterId: req.user?.userId,
    });
    return successResponse(res, users, "Usuarios obtenidos correctamente");
  } catch (error) {
    if (error.statusCode === 403) {
      return forbiddenResponse(res, error.message || "Acceso denegado", error.errors || null);
    }
    return errorResponse(res, error.message || "Error interno del servidor", error.statusCode || 500, error.errors || null);
  }
};

const createUser = async (req, res) => {
  try {
    const { error } = createUserSchema.validate(req.body);
    if (error) {
      return errorResponse(res, "Error de validación", 400, error.details);
    }
    
    const user = await createUserService(req.body, req.user);
    return successResponse(res, user, "Usuario creado correctamente", 201);
  } catch (error) {
    if (error.statusCode === 403) {
      return forbiddenResponse(res, error.message, error.errors || null);
    }
    return errorResponse(res, error.message || "Error interno del servidor", error.statusCode || 500, error.errors || null);
  }
};

const updateUser = async (req, res) => {
  try {
    const { error: paramsError } = userParamsSchema.validate(req.params);
    if (paramsError) {
      return errorResponse(res, "Id inválido", 400, paramsError.details);
    }
    const { error } = updateUserSchema.validate(req.body);
    if (error) {
      return errorResponse(res, "Error de validación", 400, error.details);
    }
    
    const contextInfo = {
      ip: req.ip || req.socket.remoteAddress || "unknown",
      path: req.originalUrl,
    };
    
    const user = await updateUserService(req.params.id, req.body, req.user, contextInfo);
    return successResponse(res, user, "Usuario actualizado correctamente");
  } catch (error) {
    if (error.statusCode === 403) {
      return forbiddenResponse(res, error.message, error.errors || null);
    }
    return errorResponse(res, error.message || "Error interno del servidor", error.statusCode || 500, error.errors || null);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { error: paramsError } = userParamsSchema.validate(req.params);
    if (paramsError) {
      return errorResponse(res, "Id inválido", 400, paramsError.details);
    }
    
    // Capturamos el motivo del body de la petición
    const { motivo } = req.body || {};

    // Seguridad: armamos el contexto extendido con el motivo y metadatos de auditoría
    const contextInfo = {
      ip: req.ip || req.socket.remoteAddress || "unknown",
      path: req.originalUrl,
      method: req.method,
      userAgent: req.headers["user-agent"] || "",
      motivo: motivo || "No especificado por el administrador",
    };
    
    const result = await deleteUserService(req.params.id, req.user, contextInfo);
    return successResponse(res, result, "Usuario eliminado correctamente");
  } catch (error) {
    if (error.statusCode === 403) {
      return forbiddenResponse(res, error.message, error.errors || null);
    }
    return errorResponse(res, error.message || "Error interno del servidor", error.statusCode || 500, error.errors || null);
  }
};

export { getUsers, createUser, updateUser, deleteUser };