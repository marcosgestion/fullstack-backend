import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
    },
    apellido: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    fechaNacimiento: {
      type: Date,
      required: true,
    },
    edad: {
      type: Number,
      required: true,
    },
    genero: {
      type: String,
      required: true,
    },
    telefono: {
      type: String,
      required: true,
    },
    direccion: {
      type: String,
      required: true,
    },
    localidad: {
      type: String,
      required: true,
    },
    provincia: {
      type: String,
      required: true,
    },
    pais: {
      type: String,
      required: true,
    },
    codigoPostal: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ROOT", "ADMIN", "USER", "GUEST"],
    },
    ultimoLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;