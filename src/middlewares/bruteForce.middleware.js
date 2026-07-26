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

const bruteForceMiddleware = async (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${ip}:${req.body?.email || "unknown"}`;

  try {
    await bruteForceLimiter.consume(key);
    next();
  } catch (rejRes) {
    const remainingTime = Math.round(rejRes.msBeforeNext / 1000);
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
    errorResponse(res, `Demasiados intentos. Intente nuevamente en ${remainingTime} segundos.`, 429, null);
  }
};

export { bruteForceMiddleware };