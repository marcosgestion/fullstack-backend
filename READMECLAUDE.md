# LP Gestión - Notas de Desarrollo (Backend)

Este es el hermano del `READMECLAUDE.md` que escribí para el frontend. Acá cuento cómo pensé el backend: las decisiones de arquitectura, por qué separé las cosas como las separé, y los problemas de seguridad que fui encontrando y cerrando en el camino.

---

## 🎯 Punto de Partida

El frontend necesitaba algo que le devolviera datos de usuarios de forma confiable y, sobre todo, segura. No alcanzaba con un CRUD básico: como el sistema maneja información personal y hay distintos niveles de acceso (ROOT, ADMIN, USER, GUEST), tenía que pensar el backend con seguridad de entrada, no como un parche después.

Elegí **Express** porque es simple y no me mete cosas de más, **MongoDB con Mongoose** porque el modelo de datos de "usuario" no tiene relaciones complejas y un documento por usuario alcanza y sobra, y **JWT** para no tener que mantener sesiones en el servidor.

---

## 📁 Cómo Organicé el Código

```
src/
├── app.js           # Arranca todo: middlewares, rutas, conexión a DB
├── config/           # Variables de entorno, conexión a Mongo, CORS
├── routes/            # Qué endpoint existe y qué middlewares le aplican
├── controllers/       # Recibe la petición HTTP, valida el shape básico, llama al service
├── services/           # Toda la lógica de negocio real vive acá
├── middlewares/        # Autenticación, roles, rate limiting, fuerza bruta
├── models/              # Schemas de Mongoose (User, Audit, SecurityLog)
├── dto/                  # Schemas de validación con Joi
└── helpers/               # Funciones chicas reutilizables (formato de respuestas)
```

La idea de separar **controller** de **service** fue a propósito: el controller solo debería saber de HTTP (leer el request, devolver una respuesta), y el service no debería saber nada de Express. Si mañana cambio de Express a otra cosa, o agrego una CLI que use la misma lógica, los services no se tocan.

---

## 🔐 Cómo Pensé la Seguridad (esto fue lo que más tiempo me llevó)

### Capas de protección, de afuera hacia adentro

1. **Rate limiting general** (`rateLimit.middleware.js`): nadie puede mandar más de X peticiones en Y minutos a la API completa. Frena scraping y ataques de denegación de servicio básicos.
2. **Protección contra fuerza bruta en el login** (`bruteForce.middleware.js`): además del límite general, el login tiene su propio contador por combinación de IP + email. Si alguien intenta adivinar una contraseña muchas veces, se bloquea esa combinación específica.
3. **Autenticación con JWT** (`auth.middleware.js`): valida que el token sea válido y no esté vencido antes de dejar pasar la petición a cualquier ruta protegida.
4. **Autorización por rol** (`role.middleware.js`): ya autenticado, valida que el rol del usuario tenga permiso para esa acción puntual.
5. **Reglas de negocio dentro de cada service**: acá es donde se pone más fino. Un ADMIN no puede tocar a otro ADMIN ni a un ROOT. Un USER o GUEST solo puede editar su propio perfil, nunca el de otro. Esto no lo puede resolver un middleware genérico, tiene que vivir en la lógica de negocio.

### El error que encontré con el limitador de fuerza bruta

Al principio, el contador de intentos de login se descontaba **en cuanto llegaba la petición**, sin importar si el usuario después ponía bien la contraseña o no. Eso significaba que alguien que se logueaba correctamente varias veces seguidas (cerrar sesión y volver a entrar, por ejemplo) terminaba bloqueado 30 minutos por nada.

Lo corregí separando las dos cosas: el middleware ahora solo *consulta* si esa combinación IP+email ya está bloqueada (sin gastar intentos), y el descuento real de un intento ocurre en el controller, únicamente cuando el login efectivamente falla por credenciales inválidas. Un usuario que loguea bien 20 veces seguidas nunca se queda afuera; uno que intenta adivinar contraseñas sigue frenado igual que antes.

### Por qué valido con Joi *antes* de tocar la base de datos

Cada dato que entra por un endpoint (crear usuario, actualizar, registrarse) pasa primero por un schema de Joi. Esto evita mandarle basura a Mongoose y confiar en que el error de la base de datos sea entendible — prefiero devolver un 400 claro ("el email no es válido") antes que un 500 genérico que no le dice nada al frontend.

El registro público (`/auth/register`) al principio no tenía esta validación, solo la tenía la creación de usuarios desde el panel de administración. Lo agregué después, porque cualquier endpoint público sin dueño detrás merece la misma desconfianza que uno protegido.

---

## 🕵️ Auditoría y Trazabilidad

Cada acción sensible queda registrada en dos colecciones distintas, con propósitos distintos:

- **`Audit`**: guarda una copia completa del usuario justo antes de ser eliminado. Es el "historial" de qué existía.
- **`SecurityLog`**: guarda eventos de seguridad — intentos de fuerza bruta, rate limiting activado, intentos sospechosos de modificar o eliminar cuentas ROOT sin permiso, y el motivo que cargó el administrador al eliminar a alguien.

La eliminación de un usuario usa una **transacción de MongoDB**: el registro de auditoría, el log de seguridad y el borrado real se hacen todos juntos o no se hace ninguno. Si algo falla a mitad de camino, no queda un usuario borrado sin rastro de auditoría, ni un log huérfano de un borrado que nunca pasó.

---

## 🎭 El Sistema de Roles en Detalle

Cuatro roles, de menor a mayor privilegio: `GUEST → USER → ADMIN → ROOT`.

Las reglas que más me costó dejar bien pensadas:

- **Un ADMIN no puede tocar a otro ADMIN.** Si pudiera, cualquier ADMIN comprometido podría des-promocionar a los demás administradores y quedarse con el control.
- **Nadie que no sea ROOT puede tocar a un usuario ROOT.** Ni siquiera ver ciertos datos si es un ADMIN consultando la lista completa. Cualquier intento se registra como alerta crítica en `SecurityLog`.
- **Un USER o GUEST solo puede editar su propio perfil**, y encima con una lista blanca de campos permitidos (no puede, por ejemplo, cambiarse el rol a sí mismo).
- **Nadie puede autoeliminarse** desde el panel. Tiene sentido: si el único ROOT se borra a sí mismo por error, nadie más puede administrar el sistema.

---

## ⚡ Decisiones Técnicas

### Por qué separar `rateLimiter` general del `bruteForceMiddleware` del login

Son problemas distintos. El rate limiter general protege la API completa de forma pareja. El de fuerza bruta es específico del login porque ahí es donde importa la combinación IP+usuario, no solo la IP sola (si limitara solo por IP, una oficina entera detrás del mismo router se bloquearía por los intentos de una sola persona).

### Por qué JWT y no sesiones en servidor

No quería depender de un store de sesiones (Redis, memoria del server) para algo que un token firmado ya resuelve. El servidor no necesita "recordar" quién está logueado: el token mismo lleva la información necesaria (id de usuario, rol) y expira solo.

### Por qué Joi y no validación manual

Escribir `if (!nombre) return error` para cada campo de cada endpoint es tedioso y fácil de olvidar en algún caso. Joi centraliza esas reglas en un solo lugar por endpoint, y los mensajes de error salen más claros para el frontend.

---

## 🐛 Problemas que Encontré y Resolví

**Problema 1:** El limitador de fuerza bruta bloqueaba usuarios legítimos que se logueaban varias veces seguidas correctamente.
**Solución:** Separé "consultar si está bloqueado" de "descontar un intento". Solo los logins fallidos gastan intentos.

**Problema 2:** El registro público no validaba los datos de entrada con Joi, a diferencia de la creación de usuarios desde el panel.
**Solución:** Agregué un schema específico para registro, con los campos mínimos obligatorios (nombre, apellido, email, contraseña) y el resto opcional, tal como ya lo esperaba el service.

**Problema 3:** El `package.json` tenía las URLs de un repositorio que no era el mío (quedaron de cuando arranqué el proyecto a partir de otro). El `package-lock.json` también tenía el nombre viejo.
**Solución:** Actualicé ambos archivos para que apunten a mi propio repositorio.

**Problema 4:** Un archivo de testing manual (`scripts/test-security.js`) tenía una línea suelta (`npm;`) que rompía el test del rate limit antes de poder loguear el resultado real.
**Solución:** Era un error de tipeo, lo saqué.

---

## 🚀 Cómo Levantar el Backend Localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Crear un archivo .env con las variables necesarias
# (ver la lista más abajo)

# 3. Correr en modo desarrollo (con recarga automática)
npm run dev

# 4. O correr sin recarga automática
npm run start
```

### Variables de entorno necesarias

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto donde escucha el servidor |
| `MONGO_URI` | Cadena de conexión a la base de datos MongoDB |
| `JWT_SECRET` | Clave para firmar y verificar los tokens |
| `JWT_EXPIRES_IN` | Cuánto dura un token antes de vencer |
| `FRONTEND_URLS` | Dominios permitidos por CORS (separados por coma) |
| `RATE_LIMIT_WINDOW_MINUTES` / `RATE_LIMIT_MAX_REQUESTS` | Configuración del límite general de peticiones |
| `LOGIN_WINDOW_MINUTES` / `LOGIN_MAX_ATTEMPTS` / `LOGIN_BLOCK_MINUTES` | Configuración del límite de intentos de login |

Ninguna de estas variables va al repositorio (`.env` está en `.gitignore`), y con razón: son las llaves del sistema.

---

## 📍 Endpoints Principales

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| `POST` | `/auth/login` | Público | Autentica y devuelve un JWT |
| `POST` | `/auth/register` | Público | Crea una cuenta nueva, siempre con rol GUEST |
| `GET` | `/users` | Cualquier rol autenticado | Lista usuarios (ROOT/ADMIN ven todos, USER/GUEST solo se ven a sí mismos) |
| `POST` | `/users` | ROOT, ADMIN | Crea un usuario nuevo |
| `PUT` | `/users/:id` | Todos, pero con restricciones por rol | Actualiza un usuario |
| `DELETE` | `/users/:id` | ROOT, ADMIN | Elimina un usuario (con auditoría obligatoria) |

---

## 📚 Qué Me Gustaría Mejorar

Si tuviera más tiempo:
- Mover el limitador de fuerza bruta de memoria (`RateLimiterMemory`) a algo persistente como Redis, para que sobreviva a un reinicio del servidor y funcione igual si en algún momento corro más de una instancia.
- Agregar tests automatizados reales (el `scripts/test-security.js` que tengo ahora es un script manual, no un test de verdad).
- Revisar y actualizar dependencias con vulnerabilidades conocidas de forma periódica, no solo cuando alguien las nota.
- Documentar los endpoints con algo tipo Swagger/OpenAPI, para no depender de que alguien lea el código para saber qué espera cada ruta.

---

## 💭 Reflexión Final

Con el backend fui más cuidadoso que con el frontend, porque acá es donde de verdad importa que las reglas se cumplan — el frontend puede tener un botón oculto o deshabilitado, pero si el backend no valida lo mismo, esa protección es de cartón. Traté de pensar cada endpoint como si alguien fuera a mandarle exactamente lo que no debería, y validar que la respuesta sea la correcta en ese caso.

Todavía hay margen de mejora, pero prefiero un sistema con menos funcionalidades y bien defendido, a uno con muchas funcionalidades y agujeros de seguridad esperando a que alguien los encuentre.
