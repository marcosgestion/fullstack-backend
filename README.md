# LP Gestión - API REST Server

Backend robusto para el sistema **LP Gestión**, desarrollado con Node.js y Express. Este proyecto implementa una arquitectura por capas orientada a la escalabilidad, gestionando la autenticación, autorización basada en roles (RBAC) y un sistema avanzado de seguridad con auditoría estricta de acciones en MongoDB.

---

## 🏗️ Arquitectura por Capas

El proyecto está estructurado utilizando el patrón de diseño de **Arquitectura por Capas** para garantizar la separación de responsabilidades, facilitando el mantenimiento y la escalabilidad del código.

```text
src/
├── config/         # Configuraciones globales (Variables de entorno, base de datos, CORS)
├── controllers/    # Controladores: Manejan las peticiones HTTP y formatean las respuestas
├── dto/            # Data Transfer Objects: Esquemas de validación de entrada de datos (Joi)
├── helpers/        # Funciones auxiliares genéricas (Formateo unificado de respuestas HTTP)
├── middlewares/    # Interceptores (Autenticación JWT, control de roles, Rate Limiting)
├── models/         # Esquemas y modelos de datos (Mongoose ODM)
├── routes/         # Definición de endpoints y mapeo con middlewares/controladores
├── services/       # Lógica de negocio core e interacción con la base de datos
└── app.js          # Punto de entrada de la aplicación y configuración de Express
```

---

## 🛠️ Stack Tecnológico Principal

| Tecnología | Propósito en el Proyecto |
| :--- | :--- |
| **Node.js + Express** | Entorno de ejecución y framework minimalista para la API REST. |
| **MongoDB + Mongoose** | Base de datos NoSQL y ODM para modelado de datos y transacciones seguras. |
| **JSON Web Tokens (JWT)** | Autenticación stateless y transmisión segura de la identidad/rol del usuario. |
| **Bcryptjs** | Encriptación unidireccional (hashing) de contraseñas. |
| **Joi** | Validación estricta de esquemas de datos en los requests (Data Transfer Objects). |
| **express-rate-limit** | Prevención de ataques DoS limitando el volumen general de peticiones. |
| **rate-limiter-flexible** | Mitigación activa de ataques de fuerza bruta específicos en memoria. |
| **Cors** | Control de acceso HTTP configurado para orígenes estrictamente definidos. |

---

## 🛡️ Seguridad, Auditoría y Reglas de Negocio

Este backend no solo gestiona datos, sino que implementa desafíos técnicos avanzados de seguridad para un entorno de producción:

### 1. Auditoría Dual y Transacciones (Mongoose Sessions)
Cada vez que un usuario es eliminado, el sistema ejecuta una **transacción** en la base de datos que garantiza dos acciones simultáneas o ninguna:
*   Registro en la colección `Audit` de los datos del usuario borrado.
*   Registro en `SecurityLog` detallando el método, IP, administrador responsable y el **motivo exacto** de la eliminación ingresado desde el frontend.

### 2. Protección de Jerarquía (Prevención de Hacks)
Existe una restricción crítica en la capa de servicios: **Ningún usuario con rol ADMIN puede modificar o eliminar a un usuario con rol ROOT**. 
Si se detecta este comportamiento, la API no solo rechaza la petición (HTTP 403), sino que genera automáticamente un log en la base de datos (`SecurityLog`) catalogado como un **incidente crítico (Intento de hack)** para mantener un registro histórico de accesos malintencionados.

### 3. Rate Limiting y Anti-Fuerza Bruta
*   **Rate Limit Global:** Restringido a 100 peticiones cada 15 minutos por IP. Los excesos quedan guardados en los logs de seguridad.
*   **Fuerza Bruta (Login):** Si un cliente falla su inicio de sesión 5 veces en menos de 15 minutos, la IP queda bloqueada temporalmente por 3 minutos antes de permitir un nuevo intento.

### 4. Matriz de Roles (RBAC)
*   **ROOT:** Control absoluto del sistema. Único rol capaz de crear/modificar otros ROOTs.
*   **ADMIN:** Gestor operativo. Puede crear/editar usuarios estándar y visualizar la base de datos, pero no interactúa con perfiles ROOT ni puede auto-promoverse.
*   **USER:** Usuario estándar. Solo tiene permisos para editar sus propios datos no críticos.
*   **GUEST:** Rol de solo lectura personal. Se asigna por defecto en el auto-registro.

---

## ⚙️ Configuración del Entorno (.env)

Para correr este proyecto, debes crear un archivo `.env` en la raíz replicando la siguiente estructura con tus propias credenciales:

```env
# Puerto de ejecución del servidor local
PORT=3080

# Conexión a MongoDB Atlas (Reemplazar <PASSWORD> por tu contraseña real)
MONGO_URI=mongodb+srv://backendadmin:<PASSWORD>@marcosf.2eb5ean.mongodb.net/user_management_db

# Seguridad JWT
JWT_SECRET=miSuperSecretKey
JWT_EXPIRES_IN=3m

# Dominios autorizados por CORS (Separados por coma, sin espacios extra)
FRONTEND_URLS=http://localhost:5173,http://localhost:3080,[https://app.miempresa.com](https://app.miempresa.com),[https://admin.miempresa.com](https://admin.miempresa.com),[http://192.168.10.210:5173](http://192.168.10.210:5173)

# ===============================
# RATE LIMIT GLOBAL
# ===============================
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100

# ===============================
# PROTECCIÓN ANTI-FUERZA BRUTA (LOGIN)
# ===============================
LOGIN_WINDOW_MINUTES=15
LOGIN_MAX_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=3
```

---

## 🚀 Instalación y Ejecución

1. **Clonar y preparar el repositorio:**
   ```bash
   git clone [https://github.com/marcosgestion/fullstack-backend.git](https://github.com/marcosgestion/fullstack-backend.git)
   cd fullstack-backend
   npm install
   ```

2. **Ejecución en Entorno de Desarrollo (con hot-reload):**
   ```bash
   npm run dev
   ```

3. **Ejecución en Producción:**
   ```bash
   npm start
   ```

4. **Scripts adicionales de mantenimiento:**
   ```bash
   npm run format       # Formatea el código fuente utilizando Prettier
   npm run format:check # Verifica el formato del código sin aplicar cambios
   ```

---

## 📍 Endpoints Principales

Todos los endpoints (excepto el login y el registro público) requieren el envío del header: `Authorization: Bearer <TOKEN>`.

| Método | Endpoint | Descripción | Permisos |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Autentica al usuario y devuelve el JWT | Público |
| `POST` | `/auth/register` | Registro público de un usuario (Rol GUEST) | Público |
| `GET` | `/users` | Obtiene el directorio de usuarios | ROOT, ADMIN, USER, GUEST |
| `POST` | `/users` | Creación de usuario desde el panel | ROOT, ADMIN |
| `PUT` | `/users/:id` | Actualización de datos de perfil | ROOT, ADMIN, USER, GUEST |
| `DELETE` | `/users/:id` | Eliminación de usuario (Requiere Motivo) | ROOT, ADMIN |

> **Nota sobre Endpoints:** Las respuestas a los métodos `GET` y `PUT` varían dinámicamente. Un `USER` o `GUEST` solo visualizará o actualizará su propia información, garantizando la privacidad de los datos ajenos independientemente del ID que intente consultar en la URL.


