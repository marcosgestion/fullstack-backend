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
- express-rate-limit para control de solicitudes
- rate-limiter-flexible para protección de fuerza bruta

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
PORT=3080
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
http://localhost:3080
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

Además, para los endpoints protegidos el cliente debe enviar un token JWT válido. En el listado de usuarios, la autorización se valida según el rol del token:

- USER: solo puede ver su propio usuario.
- ADMIN: puede ver todos los usuarios salvo los ROOT.
- ROOT: puede ver todos los usuarios.
- GUEST: recibe un 403 y no puede ver usuarios.

> Nota: los endpoints POST /users, PUT /users/:id y DELETE /users/:id requieren autenticación y permisos de ROOT o ADMIN. El endpoint GET /users ahora también exige token y aplica la regla de permisos descrita anteriormente.

## Protección de seguridad

El backend incorpora mecanismos para reducir abusos y registrar actividad sospechosa en MongoDB.

### Características agregadas

- Rate limit global para limitar la cantidad de solicitudes por ventana de tiempo.
- Protección de fuerza bruta en la ruta de login, basada en IP + email.
- Registro automático de eventos en MongoDB con información como IP, método HTTP, ruta, user-agent, email y detalles del incidente.

### Archivos relacionados

- src/middlewares/rateLimit.middleware.js
- src/middlewares/bruteForce.middleware.js
- src/models/securityLog.model.js

### Qué se guarda en MongoDB

Cada evento de seguridad queda registrado en la colección SecurityLog con campos como:

- eventType: rate_limit, brute_force o suspicious_request
- ip
- method
- path
- userAgent
- userEmail
- details

### Comportamiento esperado

- Si un cliente excede el límite de solicitudes, la API responde con un 429 y guarda el evento.
- Si se detectan demasiados intentos fallidos de login, la API responde con un 429 y bloquea temporalmente los reintentos.

### Configuración desde .env

Los valores de protección pueden modificarse sin tocar el código, editando el archivo .env en la raíz del proyecto:

```env
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_WINDOW_MINUTES=15
LOGIN_MAX_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=30
```

- RATE_LIMIT_WINDOW_MINUTES: duración de la ventana de rate limit en minutos.
- RATE_LIMIT_MAX_REQUESTS: cantidad máxima de solicitudes permitidas en esa ventana.
- LOGIN_WINDOW_MINUTES: tiempo de la ventana para intentos de login.
- LOGIN_MAX_ATTEMPTS: cantidad máxima de intentos fallidos permitidos.
- LOGIN_BLOCK_MINUTES: tiempo de bloqueo tras exceder el límite.

### Probar la seguridad desde la consola

Puedes ejecutar un script de prueba para validar el comportamiento de login y rate limit:

```bash
npm run test:security
```

Este script envía peticiones al endpoint de login y luego realiza múltiples solicitudes para comprobar que el middleware de rate limit responda con estado 429 cuando se supera el límite.

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
curl -X POST http://localhost:3080/auth/login \
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
- Requiere token: Sí
- Permisos: se validan según el rol del JWT

#### Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
```

#### Query params (opcionales)

- id: filtra por ID de usuario
- email: filtra por email

#### Comportamiento por rol

- USER: solo puede ver su propio usuario, aunque envíe un id o email de otro usuario.
- ADMIN: puede ver todos los usuarios excepto los ROOT.
- ROOT: puede ver todos los usuarios.
- GUEST: recibe 403 y no puede ver ninguna información.

#### Ejemplo con curl

```bash
curl http://localhost:3080/users \
  -H "Authorization: Bearer <token>"
```

Filtrar por email:

```bash
curl "http://localhost:3080/users?email=usuario@example.com" \
  -H "Authorization: Bearer <token>"
```

Filtrar por id:

```bash
curl "http://localhost:3080/users?id=64f0c5d4f2b4d4a5c6e7f8a9" \
  -H "Authorization: Bearer <token>"
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
curl -X POST http://localhost:3080/users \
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
curl -X PUT http://localhost:3080/users/64f0c5d4f2b4d4a5c6e7f8a9 \
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
curl -X DELETE http://localhost:3080/users/64f0c5d4f2b4d4a5c6e7f8a9 \
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