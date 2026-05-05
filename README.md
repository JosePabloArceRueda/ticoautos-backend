# TicoAutos Backend

API REST y servidor GraphQL para TicoAutos, una plataforma de compraventa de vehículos en Costa Rica. Construido con Node.js, Express 5 y MongoDB.

---

## Requisitos

- Node.js 18 o superior
- MongoDB 6 o superior
- [TSE Padrón Electoral API](https://github.com/Santaval/tse-api) corriendo localmente (requerido para validación de cédula)
- Cuenta de Twilio (2FA por SMS)
- Cuenta de SendGrid (verificación de correo)
- Proyecto en Google Cloud con credenciales OAuth 2.0
- Cuenta de Groq (validación de mensajes con IA)

---

## Instalación

**1. Clonar e instalar dependencias**

```bash
git clone https://github.com/JosePabloArceRueda/ticoautos-backend.git
cd ticoautos-backend
npm install
```

**2. Configurar variables de entorno**

```bash
cp .env.example .env
```

**3. Iniciar la API del TSE**

La API del Padrón Electoral debe estar corriendo antes de iniciar este servidor. Seguí las instrucciones en [github.com/Santaval/tse-api](https://github.com/Santaval/tse-api) y asegurate de que sea accesible en la URL configurada en `TSE_API_URL`.

**4. Iniciar el servidor**

```bash
# Desarrollo (con auto-recarga)
npm run dev

# Producción
npm start
```

El servidor inicia en `http://localhost:3000` por defecto.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `MONGO_URI` | Cadena de conexión a MongoDB | `mongodb://localhost:27017/ticoautos` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | cualquier string largo y aleatorio |
| `JWT_EXPIRES_IN` | Tiempo de expiración del JWT | `1d` |
| `BACKEND_URL` | URL completa de este servidor | `http://localhost:3000` |
| `FRONTEND_URL` | URL completa del frontend | `http://localhost:5173` |
| `TSE_API_URL` | Endpoint de la API del Padrón Electoral | `http://localhost:4000/api/v2/cedula` |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth2 | desde Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client secret de Google OAuth2 | desde Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | URL de callback de Google OAuth2 | `http://localhost:3000/api/auth/google/callback` |
| `TWILIO_ACCOUNT_SID` | Account SID de Twilio | `ACxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Auth token de Twilio | desde la consola de Twilio |
| `TWILIO_PHONE_NUMBER` | Número de Twilio para enviar SMS | `+1xxxxxxxxxx` |
| `SENDGRID_API_KEY` | API key de SendGrid | `SG.xxxxxxxxxx` |
| `SENDGRID_FROM_EMAIL` | Correo remitente verificado en SendGrid | `noreply@ticoautos.com` |
| `GROQ_API_KEY` | API key de Groq | `gsk_xxxxxxxxxx` |

---

## Autenticación

La API usa tokens JWT en el encabezado de cada solicitud protegida:

```
Authorization: Bearer <token>
```

El flujo de inicio de sesión tiene dos pasos por el 2FA vía SMS:

1. `POST /api/auth/login` devuelve un `tempToken` y envía un código OTP por SMS
2. `POST /api/auth/verify-2fa` intercambia el `tempToken` y el código OTP por el `accessToken` final

Las cuentas nuevas quedan en `status: pending` y deben verificar su correo antes de poder ingresar.

---

## Referencia de endpoints

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Registro con cédula, correo, contraseña y teléfono. El nombre y apellidos se autocompletan desde el Padrón TSE. Envía un correo de verificación. |
| POST | `/api/auth/login` | No | Inicio de sesión con correo y contraseña. Devuelve un `tempToken` y envía un código por SMS. |
| POST | `/api/auth/verify-2fa` | No | Verifica el código SMS usando el `tempToken`. Devuelve el `accessToken` final y los datos del usuario. |
| GET | `/api/auth/verify-email?token=` | No | Activa la cuenta desde el enlace enviado por correo. Redirige al frontend. |
| GET | `/api/auth/validate-cedula/:cedula` | No | Valida una cédula contra el Padrón TSE y devuelve nombre, apellidos y fecha de nacimiento. Usado por el frontend para autocompletar el formulario. |
| GET | `/api/auth/google` | No | Redirige a la pantalla de consentimiento de Google. |
| GET | `/api/auth/google/callback` | No | Callback de Google OAuth. Redirige al frontend con un token o a la página de completar registro para usuarios nuevos. |
| POST | `/api/auth/google/complete-registration` | No | Completa el registro para usuarios nuevos de Google. Requiere `tempToken`, `cedula` y `phone`. |

**POST /api/auth/register**
```json
{
  "cedula": "123456789",
  "email": "usuario@ejemplo.com",
  "password": "minimo8chars",
  "phone": "88887777"
}
```

**POST /api/auth/login**
```json
{ "email": "usuario@ejemplo.com", "password": "minimo8chars" }
```

**POST /api/auth/verify-2fa**
```json
{ "tempToken": "...", "code": "123456" }
```

---

### Perfil de usuario

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/me` | Sí | Devuelve el perfil del usuario autenticado: `name`, `lastName`, `cedula`, `phone`, `birthDate`, `authProvider` y `status`. |
| GET | `/api/me/vehicles` | Sí | Devuelve los vehículos del usuario autenticado con paginación. Acepta los mismos filtros que el listado público. |

---

### Vehículos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/vehicles` | No | Listado público de vehículos. Filtros: `brand`, `model`, `minYear`, `maxYear`, `minPrice`, `maxPrice`, `status`. Orden: `sort=price:asc` o `sort=year:desc`. Paginado con `page` y `limit`. |
| GET | `/api/vehicles/:id` | No | Detalle de un vehículo por ID. |
| POST | `/api/vehicles` | Sí | Crear un vehículo. Body: `brand`, `model`, `year`, `price`, `description` (opcional), `status` (opcional, default `AVAILABLE`). |
| PUT | `/api/vehicles/:id` | Sí | Actualizar un vehículo. Solo el propietario. Todos los campos son opcionales. |
| DELETE | `/api/vehicles/:id` | Sí | Eliminar un vehículo. Solo el propietario. |
| PATCH | `/api/vehicles/:id/mark-sold` | Sí | Marcar un vehículo como vendido. Solo el propietario. |
| POST | `/api/vehicles/:id/upload` | Sí | Subir imágenes (hasta 5). Multipart form-data, nombre del campo: `images`. |
| DELETE | `/api/vehicles/:id/images/:imageUrl` | Sí | Eliminar una imagen específica por URL. Solo el propietario. |

---

### Chat

El sistema de chat permite a los compradores interesados contactar a los dueños de vehículos. Los mensajes se alternan entre ambas partes. La IA bloquea cualquier mensaje que contenga información de contacto como teléfonos, correos, redes sociales o enlaces.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/vehicles/:vehicleId/chat` | Sí | Inicia un chat o agrega el primer mensaje en un vehículo. Body: `text` (1-500 caracteres). |
| POST | `/api/chats/:chatId/message` | Sí | Envía un mensaje en un chat existente. El mismo usuario no puede enviar dos mensajes consecutivos. Body: `text` (1-500 caracteres). |
| GET | `/api/chats/:chatId/messages` | Sí | Obtiene el historial de mensajes de un chat. Paginado con `page` y `limit`. |
| GET | `/api/me/chats/as-interested` | Sí | Lista todos los chats donde el usuario autenticado es el comprador interesado. Incluye el último mensaje de cada chat. |
| GET | `/api/me/chats/as-owner` | Sí | Lista todos los chats de los vehículos del usuario autenticado. Incluye el último mensaje de cada chat. |
| GET | `/api/me/chats/status/:vehicleId` | Sí | Verifica si existe un chat con un vehículo específico y devuelve el rol del usuario (`interested` u `owner`). |

Cuando la IA bloquea un mensaje, la respuesta es `422` con:
```json
{
  "error": "Mensaje rechazado",
  "message": "Tu mensaje contiene información de contacto. Por seguridad, las comunicaciones deben realizarse dentro de la plataforma."
}
```

---

## GraphQL

Hay un endpoint GraphQL de solo lectura disponible junto a la API REST. Usa el mismo token JWT para autenticación. No hay playground — enviá las solicitudes con `Content-Type: application/json`.

**Endpoint:** `POST /graphql`

**Consultas disponibles:**

```graphql
# Públicas
vehicles(page, limit, brand, model, minYear, maxYear, minPrice, maxPrice, status, sort): PaginatedVehicles!
vehicle(id: ID!): Vehicle

# Protegidas (requieren encabezado Authorization)
me: User
myVehicles(page, limit, brand, model, minYear, maxYear, minPrice, maxPrice, status, sort): PaginatedVehicles!
myChatsAsInterested(page, limit): [Chat!]!
myChatsAsOwner(page, limit): [Chat!]!
chatMessages(chatId: ID!, page, limit): PaginatedMessages!
```

Todas las operaciones de escritura se manejan exclusivamente a través de la API REST.

---

## Estructura del proyecto

```
src/
├── app.js
├── server.js
├── config/
│   ├── db.js
│   └── passport.js
├── middlewares/
│   ├── auth.js
│   └── upload.js
├── models/
│   ├── User.js
│   ├── Vehicle.js
│   ├── Question.js
│   └── Answer.js
├── routes/
│   ├── auth.routes.js
│   ├── auth.google.routes.js
│   ├── me.routes.js
│   ├── vehicles.public.routes.js
│   ├── vehicles.private.routes.js
│   └── qna.routes.js
├── services/
│   ├── padron.service.js
│   ├── email.service.js
│   ├── sms.service.js
│   └── ai.service.js
└── graphql/
    ├── schema.js
    ├── context.js
    └── resolvers/
        ├── index.js
        ├── user.resolver.js
        ├── vehicle.resolver.js
        └── chat.resolver.js
```

---

## Servicios externos

| Servicio | Propósito | Requerido |
|----------|-----------|-----------|
| MongoDB | Base de datos principal | Sí |
| API Padrón TSE | Validación de cédula y autocompletado de nombre | Sí |
| SendGrid | Correos de verificación de cuenta | Sí |
| Twilio | Códigos 2FA por SMS | Sí |
| Google OAuth | Inicio de sesión con Google | Sí |
| Groq | Validación de mensajes de chat con IA | Sí |
