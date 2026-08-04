import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { env } from "../config/env.js";

const loginService = async (data) => {
  try {
    const user = await User.findOne({
      email: data.email,
    });
    if (!user) {
      throw {
        statusCode: 404,
        message: "Usuario no encontrado",
      };
    }
    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      throw {
        statusCode: 401,
        message: "Password incorrecto",
      };
    }
    // Actualizar fecha y hora del último login
    user.ultimoLogin = new Date();
    await user.save();
    // Payload del token
    const payload = {
      userId: user._id,
      role: user.role,
    };
    // Generación del JWT
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
    return {
      token,
      role: user.role,
    };
  } catch (error) {
    console.error("❌ Error en loginService:", error);
    throw {
      statusCode: error.statusCode || 500,
      message: error.message || "Error interno del servidor",
      errors: error.errors || null,
    };
  }
};

const registerService = async (data) => {
  try {
    // 1. Verificar si el usuario ya existe en la base de datos
    const existingUser = await User.findOne({
      email: data.email,
    });
    if (existingUser) {
      throw {
        statusCode: 400,
        message: "El email ya se encuentra registrado.",
      };
    }

    // 2. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Crear nuevo usuario forzando el rol GUEST y enviando valores por defecto requeridos
    const newUser = await User.create({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: hashedPassword,
      role: "GUEST",
      fechaNacimiento: data.fechaNacimiento || "2000-01-01",
      edad: data.edad || 25,
      genero: data.genero || "No especificado",
      telefono: data.telefono || "000000",
      direccion: data.direccion || "Sin dirección",
      localidad: data.localidad || "Sin localidad",
      provincia: data.provincia || "Sin provincia",
      pais: data.pais || "Argentina",
      codigoPostal: data.codigoPostal || "0000",
    });

    // 4. Retornar la respuesta simplificada
    return {
      id: newUser._id,
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      email: newUser.email,
      role: newUser.role,
    };
  } catch (error) {
    console.error("❌ Error en registerService:", error);
    throw {
      statusCode: error.statusCode || 500,
      message: error.message || "Error interno del servidor",
      errors: error.errors || null,
    };
  }
};

export { loginService, registerService };