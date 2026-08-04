import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Audit from "../models/audit.model.js";
import SecurityLog from "../models/securityLog.model.js";
import mongoose from "mongoose";

// Serializa un documento de usuario para exponerlo por API, alineado con el
// resto de los endpoints (id en vez de _id, sin password).
const serializeUser = (userDoc) => {
  const { _id, password, __v, ...rest } = userDoc.toObject();
  return { id: _id, ...rest };
};

const getUsersService = async ({ email, id, requesterRole, requesterId }) => {
  console.log("📦 SERVICE → getUsersService");
  try {
    const role = requesterRole?.toUpperCase();
    const currentUserId = requesterId?.toString();

    if (!role) {
      throw { statusCode: 403, message: "No tienes permisos para ver usuarios" };
    }

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw { statusCode: 400, message: "Id inválido" };
      }

      if ((role === "USER" || role === "GUEST") && id !== currentUserId) {
        throw { statusCode: 403, message: "No tienes permisos para ver este usuario" };
      }

      const user = await User.findById(id).select("-password");
      if (!user) {
        throw { statusCode: 404, message: "Usuario no encontrado" };
      }

      if (role === "ADMIN" && user.role === "ROOT") {
        throw { statusCode: 403, message: "No tienes permisos para ver usuarios root" };
      }

      return user;
    }

    if (email) {
      const user = await User.findOne({ email }).select("-password");
      if (!user) {
        throw { statusCode: 404, message: "Usuario no encontrado" };
      }

      if ((role === "USER" || role === "GUEST") && user._id.toString() !== currentUserId) {
        throw { statusCode: 403, message: "No tienes permisos para ver este usuario" };
      }

      if (role === "ADMIN" && user.role === "ROOT") {
        throw { statusCode: 403, message: "No tienes permisos para ver usuarios root" };
      }

      return user;
    }

    if (role === "USER" || role === "GUEST") {
      const user = await User.findById(currentUserId).select("-password");
      if (!user) {
        throw { statusCode: 404, message: "Usuario no encontrado" };
      }
      return user;
    }

    if (role === "ADMIN") {
      return await User.find({ role: { $ne: "ROOT" } }).select("-password").sort({ nombre: 1 });
    }

    return await User.find().select("-password").sort({ nombre: 1 });
  } catch (error) {
    console.error("❌ Error en getUsersService:", error);
    throw {
      statusCode: error.statusCode || 500,
      message: error.message || "Error interno del servidor",
      errors: error.errors || null,
    };
  }
};

const createUserService = async (data, requester) => {
  console.log("📦 SERVICE → createUserService");
  try {
    const requesterRole = requester?.role;

    if (requesterRole === "ADMIN" && (data.role === "ADMIN" || data.role === "ROOT")) {
      throw {
        statusCode: 403,
        message: "Acceso denegado: Un ADMIN solo puede crear usuarios con rol USER o GUEST.",
      };
    }

    if (data.role === "ROOT" && requesterRole !== "ROOT") {
      throw {
        statusCode: 403,
        message: "Acceso denegado: Solo un usuario ROOT puede asignar el rol ROOT.",
      };
    }

    const existUser = await User.findOne({ email: data.email });
    if (existUser) {
      throw { statusCode: 409, message: "El usuario ya existe" };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = new User({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: hashedPassword,
      fechaNacimiento: data.fechaNacimiento,
      edad: data.edad,
      genero: data.genero,
      telefono: data.telefono,
      direccion: data.direccion,
      localidad: data.localidad,
      provincia: data.provincia,
      pais: data.pais,
      codigoPostal: data.codigoPostal,
      role: data.role || "USER",
    });

    await user.save();
    return {
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error("❌ Error en createUserService:", error);
    throw {
      statusCode: error.statusCode || 500,
      message: error.message || "Error interno del servidor",
      errors: error.errors || null,
    };
  }
};

const updateUserService = async (id, data, requester, contextInfo) => {
  console.log("📦 SERVICE → updateUserService");
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { statusCode: 400, message: "Id inválido" };
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      throw { statusCode: 404, message: "Usuario no encontrado" };
    }

    const requesterRole = requester?.role;
    const requesterId = requester?.userId;

    if (targetUser.role === "ROOT" && requesterRole !== "ROOT") {
      await SecurityLog.create({
        eventType: "suspicious_request",
        ip: contextInfo?.ip || "unknown",
        method: "PUT",
        path: contextInfo?.path || `/users/${id}`,
        userId: requesterId,
        details: {
          reason: "ALERTA CRÍTICA: Intento de hack / modificación no autorizada sobre usuario ROOT",
          targetUserId: targetUser._id,
          targetUserEmail: targetUser.email,
          attemptedByRole: requesterRole,
        },
      });

      throw {
        statusCode: 403,
        message: "Acceso denegado: Intento no autorizado de modificación sobre usuario ROOT. Incidente registrado en SecurityLog.",
      };
    }

    if (requesterRole === "ADMIN") {
      if (targetUser.role === "ADMIN") {
        throw { statusCode: 403, message: "Acceso denegado: Un ADMIN no puede modificar a otro ADMIN." };
      }
      if (data.role && (data.role === "ADMIN" || data.role === "ROOT")) {
        throw { statusCode: 403, message: "Acceso denegado: Un ADMIN no puede promover usuarios a ADMIN o ROOT." };
      }
    }

    if (requesterRole === "USER" || requesterRole === "GUEST") {
      if (id !== requesterId?.toString()) {
        throw { statusCode: 403, message: "Acceso denegado: Solo puedes modificar tu propio perfil." };
      }

      const allowedUserFields = [
        "nombre", "apellido", "edad", "fechaNacimiento", "genero",
        "telefono", "direccion", "localidad", "provincia", "pais", "codigoPostal"
      ];

      allowedUserFields.forEach((field) => {
        if (data[field] !== undefined) {
          targetUser[field] = data[field];
        }
      });

      if (data.password !== undefined) {
        targetUser.password = await bcrypt.hash(data.password, 10);
      }

      await targetUser.save();

      return serializeUser(targetUser);
    }

    if (data.email !== undefined) {
      throw { statusCode: 400, message: "El email no puede modificarse" };
    }

    const allowedFields = [
      "nombre", "apellido", "fechaNacimiento", "edad", "genero",
      "telefono", "direccion", "localidad", "provincia", "pais", "codigoPostal", "role"
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        targetUser[field] = data[field];
      }
    });

    if (data.password !== undefined) {
      targetUser.password = await bcrypt.hash(data.password, 10);
    }

    await targetUser.save();
    return serializeUser(targetUser);
  } catch (error) {
    console.error("❌ Error en updateUserService:", error);
    throw {
      statusCode: error.statusCode || 500,
      message: error.message || "Error interno del servidor",
      errors: error.errors || null,
    };
  }
};

const deleteUserService = async (id, requester, contextInfo) => {
  console.log("📦 SERVICE → deleteUserService");
  let session;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { statusCode: 400, message: "Id inválido" };
    }

    const requesterRole = requester?.role;
    const requesterId = requester?.userId;

    if (id === requesterId?.toString()) {
      throw { statusCode: 403, message: "Operación denegada: No puedes auto-eliminar tu propia cuenta." };
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      throw { statusCode: 404, message: "Usuario no encontrado" };
    }

    if (targetUser.role === "ROOT" && requesterRole !== "ROOT") {
      await SecurityLog.create({
        eventType: "suspicious_request",
        ip: contextInfo?.ip || "unknown",
        method: "DELETE",
        path: contextInfo?.path || `/users/${id}`,
        userId: requesterId,
        details: {
          reason: "ALERTA CRÍTICA: Intento de hack / eliminación no autorizada sobre usuario ROOT",
          targetUserId: targetUser._id,
          targetUserEmail: targetUser.email,
          attemptedByRole: requesterRole,
        },
      });

      throw {
        statusCode: 403,
        message: "Acceso denegado: Intento no autorizado de eliminación sobre usuario ROOT. Incidente registrado en SecurityLog.",
      };
    }

    if (requesterRole === "ADMIN" && (targetUser.role === "ADMIN" || targetUser.role === "ROOT")) {
      throw { statusCode: 403, message: "Acceso denegado: Un ADMIN solo puede eliminar usuarios con rol USER o GUEST." };
    }

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // 1. Registro en Audit original
      await Audit.create(
        [
          {
            usuarioEliminado: targetUser.toObject(),
            fechaEliminacion: new Date(),
          },
        ],
        { session }
      );

      // 2. Registro detallado en SecurityLog con motivo proporcionado desde el Frontend
      await SecurityLog.create(
        [
          {
            eventType: "user_deleted",
            ip: contextInfo?.ip || "unknown",
            method: contextInfo?.method || "DELETE",
            path: contextInfo?.path || `/users/${id}`,
            userAgent: contextInfo?.userAgent || "",
            userEmail: requester?.email || "desconocido",
            userId: requesterId || null,
            details: {
              action: "DELETE_USER",
              targetUserId: targetUser._id,
              targetUserEmail: targetUser.email,
              targetUserRole: targetUser.role,
              targetUserName: `${targetUser.nombre} ${targetUser.apellido}`,
              motivo: contextInfo?.motivo || "No especificado por el administrador",
            },
          },
        ],
        { session }
      );

      // 3. Eliminación del usuario
      await targetUser.deleteOne({ session });
    });

    return { message: "Usuario eliminado y auditado correctamente" };
  } catch (error) {
    console.error("❌ Error en deleteUserService:", error);
    throw {
      statusCode: error.statusCode || 500,
      message: error.message || "Error interno del servidor",
      errors: error.errors || null,
    };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export { getUsersService, createUserService, updateUserService, deleteUserService };