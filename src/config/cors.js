import cors from "cors";
import { env } from "./env.js";

const allowedOrigins = env.FRONTEND_URLS.split(",").map((origin) => origin.trim());
const corsConfig = cors({
  // ==========================================
  // OPCIÓN 1 (RECOMENDADA)
  // Permite únicamente los dominios definidos
  // en la variable FRONTEND_URLS del .env
  // ==========================================
  origin: (origin, callback) => {
    // Permite Postman, Insomnia y llamadas Backend → Backend
    if (!origin) {
      return callback(null, true);
    }
    // Valida que el dominio esté autorizado
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Rechaza la petición
    return callback(new Error("Origen no permitido por CORS"));
  },

  // ==========================================
  // OPCIÓN 2 (NO RECOMENDADA)
  // Permite cualquier dominio.
  // Útil para pruebas rápidas.
  // NO usar en producción.
  // IMPORTANTE:
  // Si se utiliza origin: "*"
  // NO puede usarse credentials: true.
  // ==========================================
  // origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export default corsConfig;
