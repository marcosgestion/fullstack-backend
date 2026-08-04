import { RateLimiterMemory } from "rate-limiter-flexible";
import { errorResponse } from "../helpers/response.helper.js";
import SecurityLog from "../models/securityLog.model.js";

const loginWindowMinutes = Number(process.env.LOGIN_WINDOW_MINUTES || 15);
const loginMaxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const loginBlockMinutes = Number(process.env.LOGIN_BLOCK_MINUTES || 30);

const bruteForceLimiter = new RateLimiterMemory({
  points: loginMaxAttempts,
  duration: loginWindowMinutes * 60,
  blockDuration: loginBlockMinutes * 60,
});

const getBruteForceKey = (req) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return `${ip}:${req.body?.email || "unknown"}`;
};

// Solo consulta el estado del limitador, sin descontar puntos: un login exitoso
// nunca debe contar como "intento", así que el descuento real ocurre en
// registerFailedLogin, llamado desde el controller únicamente si la
// contraseña o el usuario son inválidos.
const bruteForceMiddleware = async (req, res, next) => {
  const key = getBruteForceKey(req);

  try {
    const state = await bruteForceLimiter.get(key);
    if (state && state.remainingPoints <= 0) {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const remainingTime = Math.round(state.msBeforeNext / 1000);
      await SecurityLog.create({
        eventType: "brute_force",
        ip,
        method: req.method,
        path: req.originalUrl,
        userAgent: req.get("user-agent") || "",
        userEmail: req.body?.email || "",
        details: {
          reason: "Too many failed login attempts",
          remainingTime,
        },
      });
      return errorResponse(res, `Demasiados intentos. Intente nuevamente en ${remainingTime} segundos.`, 429, null);
    }
    next();
  } catch (error) {
    next();
  }
};

// Descuenta un intento del limitador. Se llama solo cuando el login falla
// por credenciales inválidas (401/404), nunca en un login exitoso.
const registerFailedLogin = async (req) => {
  const key = getBruteForceKey(req);
  try {
    await bruteForceLimiter.consume(key);
  } catch (rejRes) {
    // Ya estaba bloqueado o se acaba de bloquear con este intento;
    // el próximo request lo va a frenar bruteForceMiddleware.
  }
};

export { bruteForceMiddleware, registerFailedLogin };