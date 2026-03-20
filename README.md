# ThrottleX API

ThrottleX is an Express API for tenant authentication and OTP verification with Redis-backed token/session state and MongoDB persistence.

## Features

- Tenant register/login flow
- JWT access token + refresh token cookie flow
- Refresh token rotation stored in Redis
- OTP send and verify endpoints
- Protected tenant profile endpoint
- Global and route-level rate limiting

## Tech Stack

- Node.js (ES modules)
- Express
- MongoDB + Mongoose
- Redis (ioredis)
- JWT (jsonwebtoken)
- AWS SES SDK (OTP email)

## Project Structure

```text
.
|-- index.js
|-- README.md
|-- ThrottleX.postman_collection.json
|-- api/
|   |-- controllors/
|   |   |-- auth.controllor.js
|   |   |-- tenant.controllor.js
|   |-- middleware/
|   |   |-- auth.middleware.js
|   |   |-- ratelimiter.middleware.js
|   |-- models/
|   |   |-- tenant.models.js
|   |-- routes/
|   |   |-- auth.routes.js
|   |   |-- tenant.routes.js
|   |-- utils/
|       |-- ApiError.js
|       |-- ApiResponse.js
|       |-- asyncHandler.js
|-- aws/
|   |-- ses.js
|-- database/
|   |-- database.js
|   |-- redis.js
|-- redis/
|   |-- jwt.js
|-- package.json
```

## Prerequisites

- Node.js 18+
- MongoDB instance
- Redis instance
- AWS SES credentials (for OTP email delivery)

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/throttlex

# CORS (comma-separated)
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (set strong random values)
ACCESS_TOKEN_SECRET=replace-with-a-strong-secret
REFRESH_TOKEN_SECRET=replace-with-a-strong-secret

# AWS SES
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Optional
NODE_ENV=development
```

Note: OTP sender address is currently hardcoded in `aws/ses.js` (`Source` field).

## Install and Run

```bash
npm install
npm run dev
```

Production mode:

```bash
npm start
```

Default server URL:

```text
http://localhost:3000
```

## Route Mounts

- Auth routes: `/api/auth`
- Tenant routes: `/api/tenant`

## API Endpoints

### Health

- Method: `GET`
- Path: `/`

### Auth

1. Register
   - Method: `POST`
   - Path: `/api/auth/register`
   - Body:

```json
{
  "name": "Acme Inc",
  "email": "owner@acme.com",
  "password": "StrongPass123!",
  "accountType": "test"
}
```

2. Login
   - Method: `POST`
   - Path: `/api/auth/login`
   - Body:

```json
{
  "email": "owner@acme.com",
  "password": "StrongPass123!"
}
```

3. Refresh access token
   - Method: `POST`
   - Path: `/api/auth/refresh`
   - Requires: `refreshToken` cookie

4. Logout
   - Method: `POST`
   - Path: `/api/auth/logout`
   - Uses refresh cookie when present

### Tenant

1. Send OTP
   - Method: `POST`
   - Path: `/api/tenant/send`
   - Requires: `Authorization: Bearer <accessToken>`

2. Verify OTP
   - Method: `POST`
   - Path: `/api/tenant/verify`
   - Requires: `Authorization: Bearer <accessToken>`
   - Body:

```json
{
  "otp": "123456"
}
```

3. Tenant profile
   - Method: `GET`
   - Path: `/api/tenant/profile`
   - Requires: `Authorization: Bearer <accessToken>`

## Response Shape

Success responses are returned as:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {}
}
```

Unhandled/runtime errors from the async wrapper are returned as:

```json
{
  "statusCode": 510,
  "message": "Error in Code Base, Programmer Error",
  "problem": "...",
  "error": [],
  "icon": "error"
}
```

## Rate Limits

- Global API limiter: 1000 requests/IP per 60 minutes
- Register: 5 requests/IP per 15 minutes
- Login: 10 requests/IP per 10 minutes
- OTP send: 3 requests/IP per 10 minutes
- OTP verify: 10 requests/IP per 10 minutes

## Postman Collection

Import `ThrottleX.postman_collection.json` into Postman.

Included requests:

- GET `/`
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- POST `/api/auth/logout`
- POST `/api/otp/send`
- POST `/api/otp/verify`

If your current server mount is `/api/tenant`, update those two Postman request paths to:

- POST `/api/tenant/send`
- POST `/api/tenant/verify`

## Common Issues

1. `Refresh token missing`
   - Ensure client sends cookies using `credentials: "include"` (fetch) or `withCredentials: true` (Axios).

2. `Origin not allowed by CORS`
   - Add your frontend origin to `CORS_ORIGIN`.

3. OTP email not sent
   - Verify AWS credentials and SES sender/region configuration in `aws/ses.js`.

4. Redis errors
   - Verify `REDIS_HOST`, `REDIS_PORT`, and optional `REDIS_PASSWORD`.

5. MongoDB connection failure
   - Verify `MONGO_URI`.

## Security Notes

- Use strong, unique JWT secrets.
- Do not commit real credentials.
- Keep production `NODE_ENV=production` for secure cookie behavior.
