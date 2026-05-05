# TicoAutos Backend

REST API and GraphQL server for TicoAutos, a vehicle marketplace platform for Costa Rica. Built with Node.js, Express 5, and MongoDB.

---

## Requirements

- Node.js 18 or higher
- MongoDB 6 or higher
- [TSE Padrón Electoral API](https://github.com/Santaval/tse-api) running locally (required for cedula validation)
- A Twilio account (SMS 2FA)
- A SendGrid account (email verification)
- A Google Cloud project with OAuth 2.0 credentials
- A Groq account (AI chat validation)

---

## Setup

**1. Clone and install dependencies**

```bash
git clone https://github.com/JosePabloArceRueda/ticoautos-backend.git
cd ticoautos-backend
npm install
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

**3. Start the TSE API**

The TSE Padrón Electoral API must be running before starting this server. Follow the instructions in [github.com/Santaval/tse-api](https://github.com/Santaval/tse-api) and make sure it is accessible at the URL configured in `TSE_API_URL`.

**4. Start the server**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:3000` by default.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/ticoautos` |
| `JWT_SECRET` | Secret key for signing JWT tokens | any long random string |
| `JWT_EXPIRES_IN` | JWT expiration time | `1d` |
| `BACKEND_URL` | Full URL of this server | `http://localhost:3000` |
| `FRONTEND_URL` | Full URL of the frontend app | `http://localhost:5173` |
| `TSE_API_URL` | TSE Padrón Electoral API endpoint | `http://localhost:4000/api/v2/cedula` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Google OAuth2 callback URL | `http://localhost:3000/api/auth/google/callback` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | from Twilio Console |
| `TWILIO_PHONE_NUMBER` | Twilio number used to send SMS | `+1xxxxxxxxxx` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xxxxxxxxxx` |
| `SENDGRID_FROM_EMAIL` | Verified sender email in SendGrid | `noreply@ticoautos.com` |
| `GROQ_API_KEY` | Groq API key for AI validation | `gsk_xxxxxxxxxx` |

---

## Authentication

The API uses JWT Bearer tokens. Include the token in every protected request:

```
Authorization: Bearer <token>
```

The login flow has two steps due to SMS-based 2FA:

1. `POST /api/auth/login` returns a `tempToken` and sends an OTP code via SMS
2. `POST /api/auth/verify-2fa` exchanges the `tempToken` and OTP for the final `accessToken`

New accounts start with `status: pending` and must verify their email before they can log in.

---

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register with cedula, email, password and phone. Name and last name are auto-filled from the TSE registry. Sends a verification email. |
| POST | `/api/auth/login` | No | Login with email and password. Returns a `tempToken` and sends an SMS code. |
| POST | `/api/auth/verify-2fa` | No | Verify the SMS code using the `tempToken`. Returns the final `accessToken` and user data. |
| GET | `/api/auth/verify-email?token=` | No | Activates the account from the link sent by email. Redirects to the frontend. |
| GET | `/api/auth/validate-cedula/:cedula` | No | Validates a cedula against the TSE registry and returns name, last name and birth date. Used by the frontend to auto-fill the registration form. |
| GET | `/api/auth/google` | No | Redirects to the Google consent screen. |
| GET | `/api/auth/google/callback` | No | Google OAuth callback. Redirects to the frontend with a token or to a registration completion page for new users. |
| POST | `/api/auth/google/complete-registration` | No | Completes registration for new Google users. Requires `tempToken`, `cedula` and `phone`. |

**POST /api/auth/register**
```json
{
  "cedula": "123456789",
  "email": "user@example.com",
  "password": "minimo8chars",
  "phone": "88887777"
}
```

**POST /api/auth/login**
```json
{ "email": "user@example.com", "password": "minimo8chars" }
```

**POST /api/auth/verify-2fa**
```json
{ "tempToken": "...", "code": "123456" }
```

---

### User Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/me` | Yes | Returns the authenticated user's profile: `name`, `lastName`, `cedula`, `phone`, `birthDate`, `authProvider` and `status`. |
| GET | `/api/me/vehicles` | Yes | Returns the authenticated user's vehicles with pagination. Accepts the same query filters as the public vehicles list. |

---

### Vehicles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vehicles` | No | List all vehicles. Filters: `brand`, `model`, `minYear`, `maxYear`, `minPrice`, `maxPrice`, `status`. Sort: `sort=price:asc` or `sort=year:desc`. Paginated via `page` and `limit`. |
| GET | `/api/vehicles/:id` | No | Get a single vehicle by ID. |
| POST | `/api/vehicles` | Yes | Create a vehicle. Body: `brand`, `model`, `year`, `price`, `description` (optional), `status` (optional, default `AVAILABLE`). |
| PUT | `/api/vehicles/:id` | Yes | Update a vehicle. Owner only. All fields are optional. |
| DELETE | `/api/vehicles/:id` | Yes | Delete a vehicle. Owner only. |
| PATCH | `/api/vehicles/:id/mark-sold` | Yes | Mark a vehicle as sold. Owner only. |
| POST | `/api/vehicles/:id/upload` | Yes | Upload images (up to 5). Multipart form-data, field name: `images`. |
| DELETE | `/api/vehicles/:id/images/:imageUrl` | Yes | Remove a specific image by URL. Owner only. |

---

### Chat

The chat system allows interested buyers to contact vehicle owners. Messages alternate between both parties. AI validation blocks any message that contains contact information such as phone numbers, emails, social media handles or links.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/vehicles/:vehicleId/chat` | Yes | Start a new chat or add the first message on a vehicle. Body: `text` (1-500 chars). |
| POST | `/api/chats/:chatId/message` | Yes | Send a message in an existing chat. The same user cannot send two consecutive messages. Body: `text` (1-500 chars). |
| GET | `/api/chats/:chatId/messages` | Yes | Get the message history of a chat. Paginated via `page` and `limit`. |
| GET | `/api/me/chats/as-interested` | Yes | Get all chats where the authenticated user is the buyer. Includes the last message of each chat. |
| GET | `/api/me/chats/as-owner` | Yes | Get all chats for the authenticated user's vehicles. Includes the last message of each chat. |
| GET | `/api/me/chats/status/:vehicleId` | Yes | Check if a chat exists with a specific vehicle and return the user's role (`interested` or `owner`). |

When a message is blocked by AI, the response is `422` with:
```json
{
  "error": "Mensaje rechazado",
  "message": "Tu mensaje contiene información de contacto. Por seguridad, las comunicaciones deben realizarse dentro de la plataforma."
}
```

---

## GraphQL

A read-only GraphQL endpoint is available alongside the REST API. It uses the same JWT token for authentication. There is no playground — send requests with `Content-Type: application/json`.

**Endpoint:** `POST /graphql`

**Available queries:**

```graphql
# Public
vehicles(page, limit, brand, model, minYear, maxYear, minPrice, maxPrice, status, sort): PaginatedVehicles!
vehicle(id: ID!): Vehicle

# Protected (require Authorization header)
me: User
myVehicles(page, limit, brand, model, minYear, maxYear, minPrice, maxPrice, status, sort): PaginatedVehicles!
myChatsAsInterested(page, limit): [Chat!]!
myChatsAsOwner(page, limit): [Chat!]!
chatMessages(chatId: ID!, page, limit): PaginatedMessages!
```

All mutations are handled through the REST API.

---

## Project Structure

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

## External Services

| Service | Purpose | Required |
|---------|---------|----------|
| MongoDB | Primary database | Yes |
| TSE Padrón API | Cedula validation and name auto-fill | Yes |
| SendGrid | Account verification emails | Yes |
| Twilio | SMS 2FA codes | Yes |
| Google OAuth | Social login | Yes |
| Groq | AI validation of chat messages | Yes |
