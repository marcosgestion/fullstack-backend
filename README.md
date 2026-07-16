# CRUD User Backend S6

Backend para gestionar usuarios con autenticación JWT, roles y conexión a MongoDB. El proyecto permite crear, listar, actualizar y eliminar usuarios, además de realizar login para obtener un token de acceso.

## Tecnologías utilizadas

- Node.js
- Express
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- bcryptjs
- Joi para validaciones
- dotenv para variables de entorno

## Requisitos

- Node.js 18 o superior
- MongoDB activo localmente o remoto

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:

```bash
npm install
```

3. Crear un archivo .env en la raíz del proyecto con las siguientes variables:

```env
PORT=7000
MONGO_URI=mongodb://127.0.0.1:27017/crud-user-back-s6
JWT_SECRET=mi_super_secreto
JWT_EXPIRES_IN=1h
FRONTEND_URLS=http://localhost:5173
```

## Ejecutar el proyecto

Modo desarrollo:

```bash
npm run dev
```

Modo producción:

```bash
npm start
```

La API quedará disponible en:

```text
http://localhost:7000
```

## Estructura del proyecto

- src/app.js: inicialización del servidor
- src/routes: definición de rutas
- src/controllers: controladores de la API
- src/services: lógica de negocio
- src/models: modelos de Mongoose
- src/middlewares: autenticación y autorización
- src/dto: validaciones con Joi

## Autenticación

El login devuelve un token JWT. Para los endpoints protegidos, debes enviar este header:

```http
Authorization: Bearer <token>
```

Además, para los endpoints de actualización y eliminación, el usuario debe tener rol ROOT o ADMIN.

> Nota: en la implementación actual, los endpoints GET /users y POST /users están habilitados sin token. Los endpoints PUT /users/:id y DELETE /users/:id sí requieren autenticación y permisos.

## Endpoints

### 1) Login

- Método: POST
- Ruta: /auth/login
- Requiere token: No

#### Headers

```http
Content-Type: application/json
```

#### Body

```json
{
  "email": "usuario@example.com",
  "password": "123456"
}
```

#### Ejemplo con curl

```bash
curl -X POST http://localhost:7000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","password":"123456"}'
```

#### Respuesta esperada

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "<jwt_token>",
    "role": "ADMIN"
  }
}
```

---

### 2) Listar usuarios

- Método: GET
- Ruta: /users
- Requiere token: No (actualmente)

#### Headers

```http
Content-Type: application/json
```

#### Query params (opcionales)

- id: filtra por ID de usuario
- email: filtra por email

#### Ejemplo con curl

```bash
curl http://localhost:7000/users
```

Filtrar por email:

```bash
curl "http://localhost:7000/users?email=usuario@example.com"
```

Filtrar por id:

```bash
curl "http://localhost:7000/users?id=64f0c5d4f2b4d4a5c6e7f8a9"
```

---

### 3) Crear usuario

- Método: POST
- Ruta: /users
- Requiere token: No (actualmente)

#### Headers

```http
Content-Type: application/json
```

#### Body

```json
{
  "nombre": "Nicolás",
  "apellido": "Frugoni",
  "email": "nicolas@example.com",
  "password": "123456",
  "fechaNacimiento": "2000-01-01",
  "edad": 25,
  "genero": "Masculino",
  "telefono": "1122334455",
  "direccion": "Av. Siempre Viva 123",
  "localidad": "Córdoba",
  "provincia": "Córdoba",
  "pais": "Argentina",
  "codigoPostal": "5000",
  "role": "USER"
}
```

#### Campos obligatorios

- nombre
- apellido
- email
- password
- fechaNacimiento
- edad
- genero
- telefono
- direccion
- localidad
- provincia
- pais
- codigoPostal

#### Ejemplo con curl

```bash
curl -X POST http://localhost:7000/users \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nicolás",
    "apellido": "Frugoni",
    "email": "nicolas@example.com",
    "password": "123456",
    "fechaNacimiento": "2000-01-01",
    "edad": 25,
    "genero": "Masculino",
    "telefono": "1122334455",
    "direccion": "Av. Siempre Viva 123",
    "localidad": "Córdoba",
    "provincia": "Córdoba",
    "pais": "Argentina",
    "codigoPostal": "5000",
    "role": "USER"
  }'
```

---

### 4) Actualizar usuario

- Método: PUT
- Ruta: /users/:id
- Requiere token: Sí
- Roles permitidos: ROOT, ADMIN

#### Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
```

#### Body

Puedes enviar uno o varios de estos campos:

```json
{
  "nombre": "Nicolás Actualizado",
  "apellido": "Frugoni",
  "edad": 26,
  "telefono": "1199887766",
  "direccion": "Nueva dirección 456",
  "password": "nuevaPassword123"
}
```

#### Consideraciones

- El campo email no se puede modificar.
- Debe enviarse al menos un campo para actualizar.
- El id debe ser un ObjectId válido de MongoDB.

#### Ejemplo con curl

```bash
curl -X PUT http://localhost:7000/users/64f0c5d4f2b4d4a5c6e7f8a9 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "nombre": "Nicolás Actualizado",
    "edad": 26
  }'
```

---

### 5) Eliminar usuario

- Método: DELETE
- Ruta: /users/:id
- Requiere token: Sí
- Roles permitidos: ROOT, ADMIN

#### Headers

```http
Authorization: Bearer <token>
```

#### Body

No requiere body.

#### Ejemplo con curl

```bash
curl -X DELETE http://localhost:7000/users/64f0c5d4f2b4d4a5c6e7f8a9 \
  -H "Authorization: Bearer <token>"
```

---

## Roles disponibles

- ROOT
- ADMIN
- USER
- GUEST

## Códigos de respuesta comunes

- 200: operación exitosa
- 201: usuario creado correctamente
- 400: error de validación o datos inválidos
- 401: token faltante o inválido
- 403: acceso denegado por rol
- 404: recurso no encontrado
- 409: usuario ya existe

## Recomendación para probar en Postman o Thunder Client

1. Ejecutar POST /auth/login con un usuario existente.
2. Copiar el token recibido.
3. En los endpoints protegidos, agregar el header Authorization con el valor Bearer <token>.
4. Para probar PUT y DELETE, usar un usuario con rol ROOT o ADMIN.
