# LP Gestión — Backend

Servidor de la API del sistema **LP Gestión**, desarrollado con Node.js y Express. Se encarga del inicio de sesión, el registro de usuarios, el sistema de roles y permisos, y el registro de auditoría de las acciones que se hacen sobre los datos, todo guardado en una base de datos MongoDB.

Este proyecto parte de una base de código entregada por la cátedra, con la arquitectura general (organización por capas, elección de tecnologías, sistema de roles) ya definida. El trabajo propio consistió en corregir errores de seguridad y de lógica, completar validaciones que faltaban, y prolijar la configuración del proyecto.

---

## Estructura del proyecto

El código está organizado por capas, separando cada responsabilidad en su propia carpeta:

```text
src/
├── app.js          # Arranca el servidor: conecta los middlewares, las rutas y la base de datos
├── config/         # Variables de entorno, conexión a la base de datos, configuración de CORS
├── controllers/    # Reciben la petición HTTP y llaman a la función que corresponde
├── dto/            # Reglas de validación de los datos que llegan en cada petición
├── helpers/        # Funciones chicas reutilizables (dar formato a las respuestas del servidor)
├── middlewares/     # Funciones que se ejecutan antes que el controlador: verifican el token de sesión, el rol, y limitan la cantidad de peticiones
├── models/          # Definición de cómo se guardan los datos en la base de datos
├── routes/          # Qué dirección (endpoint) existe y qué funciones se ejecutan en cada una
└── services/        # Toda la lógica de negocio real: qué se permite hacer y qué no
```

La razón de separar el controlador del servicio es que el controlador solo debería ocuparse de la comunicación HTTP (leer la petición, devolver una respuesta), mientras que el servicio contiene las reglas del negocio sin depender de ningún detalle técnico del servidor web. Si en algún momento se necesitara reutilizar esa misma lógica desde otro lugar (por ejemplo, un script de línea de comandos), no habría que reescribirla.

---

## Tecnologías utilizadas

| Tecnología | Para qué se usa |
| :--- | :--- |
| **Node.js + Express** | Motor de ejecución y framework del servidor. |
| **MongoDB + Mongoose** | Base de datos y la librería que traduce entre el código y la base de datos. |
| **Tokens firmados (JSON Web Token)** | Forma de mantener la sesión iniciada sin que el servidor tenga que recordar quién está conectado: el propio token contiene esa información y vence solo después de un tiempo. |
| **Bcrypt** | Encriptación de contraseñas: nunca se guarda una contraseña en texto plano en la base de datos. |
| **Joi** | Validación de los datos que llegan en cada petición, antes de intentar guardarlos. |
| **express-rate-limit** | Límite general de peticiones por dirección IP, para evitar sobrecargas o ataques automatizados. |
| **rate-limiter-flexible** | Límite específico de intentos de inicio de sesión, para frenar intentos repetidos de adivinar una contraseña. |
| **Cors** | Configuración que define qué sitios web tienen permitido llamar a esta API. |

---

## Seguridad y control de acceso

### Capas de protección

Una petición que llega al servidor pasa, en orden, por varias verificaciones antes de ejecutarse:

1. **Límite general de peticiones** — nadie puede mandar una cantidad excesiva de peticiones en poco tiempo a la API completa.
2. **Límite de intentos de inicio de sesión** — además del límite general, el inicio de sesión tiene su propio contador por combinación de dirección IP y email, para frenar intentos repetidos de adivinar una contraseña.
3. **Verificación del token de sesión** — se comprueba que el token enviado sea válido y no haya vencido.
4. **Verificación de rol** — ya identificado el usuario, se comprueba que su rol tenga permiso para la acción que está pidiendo.
5. **Reglas específicas de cada operación** — algunas reglas son demasiado específicas para resolverse con una verificación genérica. Por ejemplo: un usuario con rol de administrador no puede modificar a otro administrador, ni a un superusuario. Estas reglas viven directamente en la lógica de negocio de cada operación.

### Corrección al límite de intentos de inicio de sesión

Se encontró un error en el que el contador de intentos fallidos se descontaba apenas llegaba la petición, sin importar si la contraseña ingresada resultaba correcta. Esto provocaba que un usuario que iniciaba sesión correctamente varias veces seguidas (por ejemplo, al cerrar sesión y volver a entrar) terminara bloqueado por un rato sin haber cometido ningún error real.

Se corrigió separando las dos partes: primero se consulta si esa combinación de dirección IP y email ya está bloqueada (sin gastar ningún intento en esa consulta), y recién se descuenta un intento cuando el inicio de sesión efectivamente falla por una contraseña o usuario incorrectos. Con esto, iniciar sesión correctamente nunca cuenta en contra, y los intentos de adivinar una contraseña siguen frenados igual que antes.

### Validación de datos de entrada

Cada dato que llega a través de un endpoint (crear un usuario, actualizarlo, registrarse) se valida primero con un conjunto de reglas antes de intentar guardarlo en la base de datos. Esto permite devolver un mensaje de error claro y específico (por ejemplo, "el email no tiene un formato válido") en vez de un error genérico del servidor que no le dice nada útil a quien está usando la aplicación.

El registro público de nuevas cuentas no tenía este tipo de validación al principio — solo la tenía la creación de usuarios desde el panel administrativo. Se agregó, porque cualquier punto de entrada abierto al público merece la misma revisión que uno protegido.

### Registro de auditoría

Cada vez que se elimina un usuario, el sistema realiza dos registros de forma conjunta: una copia completa de los datos del usuario eliminado (para conservar un historial de lo que existía), y un registro de seguridad con quién hizo la eliminación, desde qué dirección IP, y el motivo exacto que se escribió al confirmar el borrado. Estas dos escrituras se hacen dentro de una única operación de base de datos: o se completan las dos, o no se completa ninguna, para que nunca quede un usuario borrado sin su rastro de auditoría correspondiente.

También queda un registro cuando se detecta un intento de modificar o eliminar a un usuario con el rol más alto (superusuario) por parte de alguien que no tiene ese mismo rol — ese intento se guarda como una alerta de seguridad, aunque la acción en sí sea rechazada.

### Sistema de roles

Existen cuatro niveles de acceso, de menor a mayor privilegio: **invitado**, **usuario**, **administrador** y **superusuario**. Algunas reglas puntuales:

- Un administrador no puede modificar a otro administrador (si pudiera, un administrador comprometido podría bajar de rango a los demás y quedarse con el control exclusivo del sistema).
- Nadie que no tenga el rol de superusuario puede modificar o eliminar a un usuario con ese rol.
- Un usuario común o invitado solo puede editar su propio perfil, y únicamente los campos que no comprometen la seguridad (no puede, por ejemplo, cambiarse el rol a sí mismo).
- Nadie puede eliminar su propia cuenta desde el panel — si la única cuenta de superusuario se borrara a sí misma por error, nadie más podría administrar el sistema.

---

## Configuración del entorno

El proyecto necesita un archivo `.env` en la raíz con estas variables (los valores de ejemplo hay que reemplazarlos por los reales):

```env
# Puerto donde corre el servidor
PORT=3080

# Cadena de conexión a la base de datos MongoDB
MONGO_URI=mongodb+srv://usuario:<CONTRASEÑA>@tu-cluster.mongodb.net/nombre_de_base

# Configuración de los tokens de sesión
JWT_SECRET=<una-clave-secreta-propia>
JWT_EXPIRES_IN=3m

# Direcciones desde las que se permite llamar a esta API, separadas por coma
FRONTEND_URLS=http://localhost:5173,http://localhost:3080

# Límite general de peticiones
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100

# Límite de intentos de inicio de sesión
LOGIN_WINDOW_MINUTES=15
LOGIN_MAX_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=30
```

Este archivo nunca se sube al repositorio (está excluido mediante `.gitignore`), porque contiene las credenciales reales del sistema.

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio e instalar dependencias
git clone https://github.com/marcosgestion/fullstack-backend.git
cd fullstack-backend
npm install

# 2. Levantar el servidor en modo desarrollo (se reinicia solo ante cada cambio)
npm run dev

# 3. Levantar el servidor en modo producción
npm start

# 4. Dar formato al código
npm run format
```

---

## Endpoints disponibles

Todos los endpoints, salvo el inicio de sesión y el registro, requieren enviar el token de sesión en la petición.

| Método | Dirección | Qué hace | Quién puede usarlo |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Inicia sesión y devuelve el token | Cualquiera |
| `POST` | `/auth/register` | Crea una cuenta nueva (siempre con el rol más bajo) | Cualquiera |
| `GET` | `/users` | Devuelve el listado de usuarios | Cualquier rol con sesión iniciada |
| `POST` | `/users` | Crea un usuario nuevo desde el panel | Administrador, superusuario |
| `PUT` | `/users/:id` | Actualiza los datos de un usuario | Todos, con restricciones según el rol |
| `DELETE` | `/users/:id` | Elimina un usuario (exige un motivo) | Administrador, superusuario |

Un detalle importante: la respuesta de los endpoints de consulta y actualización no es siempre la misma para todos. Un usuario común o invitado solo puede ver o modificar su propia información, sin importar qué identificador intente consultar en la dirección.

---

## Cambios realizados sobre la base del proyecto

Estos son los cambios y correcciones concretas que se hicieron sobre el código entregado por la cátedra:

- **Límite de intentos de inicio de sesión mal calculado:** contaba también los inicios de sesión exitosos, lo que podía bloquear a un usuario legítimo sin motivo. Se corrigió para que solo cuenten los intentos fallidos.
- **Registro público sin validación:** el endpoint de registro de nuevas cuentas no verificaba los datos de entrada antes de guardarlos. Se agregó la misma validación que ya tenía la creación de usuarios desde el panel.
- **Datos incompletos al actualizar un usuario:** al editar el perfil de un usuario, el servidor devolvía solo una parte de los datos actualizados, lo que hacía que la pantalla mostrara información desactualizada hasta recargar la página a mano. Se corrigió para que devuelva el usuario completo.
- **Configuración del proyecto desactualizada:** el archivo de configuración (`package.json`) tenía las direcciones de un repositorio ajeno, quedadas de cuando se armó el proyecto a partir de una plantilla. Se actualizó para que apunte al repositorio real.
- **Dependencias con vulnerabilidades conocidas:** se actualizaron las librerías del proyecto para resolver alertas de seguridad detectadas automáticamente.
- **Errores menores:** una línea de código sobrante en un script de pruebas manuales, y mensajes promocionales innecesarios que aparecían en la consola al iniciar el servidor.

---

## Qué faltaría para seguir mejorando

- Pruebas automatizadas reales (hoy solo existe un script manual de verificación).
- Mover el límite de intentos de inicio de sesión de la memoria del servidor a un almacenamiento persistente, para que no se reinicie cada vez que el servidor se reinicia.
- Revisión periódica de vulnerabilidades en las dependencias del proyecto.
- Documentación formal de los endpoints, para no depender de leer el código para saber qué espera cada uno.
