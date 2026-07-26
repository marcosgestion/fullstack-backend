export const successResponse = (res, data = null, message = "Operación exitosa", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
};

export const forbiddenResponse = (res, message = "Acceso denegado", errors = null) => {
  return res.status(403).json({
    success: false,
    statusCode: 403,
    message,
    errors,
  });
};

export const errorResponse = (res, message = "Error interno del servidor", statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
  });
};