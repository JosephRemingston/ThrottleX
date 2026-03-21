# ThrottleX API

ThrottleX is an Express API for tenant authentication, OTP verification, and tenant-scoped API key management using MongoDB and Redis.

## Current Features

- Tenant registration and login
- JWT access token and refresh token flow
- Refresh token storage and rotation in Redis
- OTP send and verify flow via AWS SES
- Protected tenant profile endpoint
- API key generation and revoke endpoints
- Global and endpoint-level rate limiting
- Startup-time environment validation (fail-fast)

## Tech Stack

- Node.js (ES modules)
- Express 5
- MongoDB + Mongoose
- Redis (ioredis)
- JWT (jsonwebtoken)
- AWS SES v3 SDK

## Project Structure

```text
.
|-- index.js
|-- config/
|   |-- env.js
|-- api/
|   |-- controllors/
|   |   |-- auth.controllor.js
|   |   |-- tenant.controllor.js
|   |   |-- apiKey.controllor.js
|   |-- middleware/
|   |   |-- auth.middleware.js
|   |   |-- ratelimiter.middleware.js
|   |-- models/
|   |   |-- tenant.models.js
|   |   |-- apiKey.models.js
|   |-- routes/
|   |   |-- auth.routes.js
|   |   |-- tenant.routes.js
|   |   |-- apiKey.routes.js
|   |-- utils/
|       |-- ApiError.js
|       |-- ApiResponse.js
|       |-- asyncHandler.js
|       |-- generateApiKey.js
|       |-- generateOtp.js
|-- aws/
|   |-- ses.js
|-- database/
|   |-- database.js
|   |-- redis.js
|-- redis/
|   |-- jwt.js
|-- package.json
|-- README.md
```

## Prerequisites

- Node.js 18+
- MongoDB instance
- Redis instance
- AWS SES credentials and a verified sender identity

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

# JWT
ACCESS_TOKEN_SECRET=replace-with-a-strong-secret
REFRESH_TOKEN_SECRET=replace-with-a-strong-secret

# AWS SES
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_SES_REGION=ap-southeast-1
AWS_SES_SOURCE_EMAIL=verified-sender@example.com

# Optional
NODE_ENV=development
```

### Strict Startup Validation

The app validates required env vars in `config/env.js` before startup. If any required variable is missing or blank, the process exits with an error.

Required env vars:

- MONGO_URI
- ACCESS_TOKEN_SECRET
- REFRESH_TOKEN_SECRET
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_SES_REGION
- AWS_SES_SOURCE_EMAIL

`PORT` is optional, but if set it must be numeric.

## Install and Run

```bash
npm install
npm run dev
```

Production:

```bash
npm start
```

Default server URL: `http://localhost:3000`

## Mounted Routes

- `/api/auth`
- `/api/tenant`
- `/api/apikey`

## API Endpoints

### Health

- `GET /`

### Auth

1. `POST /api/auth/register`
Body:

```json
{
  "name": "Acme Inc",
  "email": "owner@acme.com",
  "password": "StrongPass123!",
  "accountType": "test"
}
```

2. `POST /api/auth/login`
Body:

```json
{
  "email": "owner@acme.com",
  "password": "StrongPass123!"
}
```

3. `POST /api/auth/refresh`
- Requires `refreshToken` cookie

4. `POST /api/auth/logout`
- Uses refresh cookie when present

### Tenant

All tenant endpoints require `Authorization: Bearer <accessToken>`.

1. `POST /api/tenant/send`
2. `POST /api/tenant/verify`
Body:

```json
{
  "otp": "123456"
}
```

3. `GET /api/tenant/profile`

### API Keys

All API key endpoints require `Authorization: Bearer <accessToken>`.

1. `POST /api/apikey/generate`
- Generates a tenant API key and returns it once in response.

2. `POST /api/apikey/revoke`
Body:

```json
{
  "keyId": "your-key-id"
}
```

## Response Format

Successful responses follow this shape:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {}
}
```

## Rate Limits

- Global API limiter: 1000 requests per IP per 60 minutes
- Register: 5 requests per IP per 15 minutes
- Login: 10 requests per IP per 10 minutes
- OTP send: 3 requests per IP per 10 minutes
- OTP verify: 10 requests per IP per 10 minutes
- API key generate/revoke: 5 requests per IP per 60 minutes

## Common Issues

1. `Refresh token missing`
- Ensure the client sends cookies (`credentials: "include"` for fetch or `withCredentials: true` for Axios).

2. `Origin not allowed by CORS`
- Add your frontend origin to `CORS_ORIGIN`.

3. OTP email is not sent
- Verify AWS credentials, SES region, and SES source identity.

4. Redis connection error
- Verify `REDIS_HOST`, `REDIS_PORT`, and optional `REDIS_PASSWORD`.

5. MongoDB connection failure
- Verify `MONGO_URI`.

## Notes

- `dockerfile` is present but currently scaffold-level and not production-ready.
- There are currently no automated tests in this repository.

## Security Notes

- Use strong, unique JWT secrets.
- Never commit real credentials.
- Set `NODE_ENV=production` in production deployments.
