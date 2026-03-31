# ThrottleX API

ThrottleX is an Express 5 API for multi-tenant authentication, OTP verification, and tenant-scoped API key management. It uses MongoDB for persistent data, Redis for token and OTP storage, and AWS SES for email delivery.

## Features

- Tenant registration and login
- JWT access tokens with refresh-token rotation
- Refresh token storage in Redis
- Logout with access-token blacklisting
- OTP delivery through AWS SES
- Tenant profile retrieval
- Tenant-scoped API key generation and revocation
- Global and route-level rate limiting
- Environment validation at startup

## Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- Redis with ioredis
- JWT with `jsonwebtoken`
- AWS SES v3 SDK
- Joi for environment validation

## Project Structure

```text
.
|-- api/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- utils/
|-- aws/
|-- config/
|-- database/
|-- redis/
|-- index.js
|-- package.json
|-- README.md
```

## Prerequisites

- Node.js 18+
- MongoDB
- Redis
- AWS SES credentials and a verified sender email

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/throttlex

CORS_ORIGIN=http://localhost:5173

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ACCESS_TOKEN_SECRET=replace-with-at-least-32-characters
REFRESH_TOKEN_SECRET=replace-with-at-least-32-characters

AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=ap-south-1
AWS_SES_SOURCE_EMAIL=verified-sender@example.com
```

3. Start the API:

```bash
npm run dev
```

Production:

```bash
npm start
```

The server listens on `http://localhost:3000` unless `PORT` is overridden.

## Environment Validation

The app validates environment variables on startup in `config/env.js`.

Required values:

- `MONGO_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SES_REGION`
- `AWS_SES_SOURCE_EMAIL`

Optional values:

- `PORT`
- `CORS_ORIGIN`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

## Auth Flow

1. Register a tenant with `name`, `email`, `password`, and `accountType`.
2. Log in to receive an access token and a `refreshToken` HTTP-only cookie.
3. Send the access token as `Authorization: Bearer <token>` to protected routes.
4. Use `POST /api/auth/refresh` to rotate the refresh token and obtain a new access token.
5. Use `POST /api/auth/logout` to delete the stored refresh token and blacklist the access token.

Access token expiry: `15m`

Refresh token expiry: `7d`

## Cookie and CORS Notes

- Refresh tokens are stored in an HTTP-only cookie named `refreshToken`.
- In development, the cookie uses `SameSite=lax`.
- In production, the cookie uses `SameSite=none` and `secure=true`.
- `CORS_ORIGIN` supports a comma-separated allowlist.
- Refresh and logout requests with a refresh cookie must come from a trusted origin or referer.

## Routes

Base URL examples below assume `http://localhost:3000`.

### Health

`GET /`

Response:

```json
{
  "message": "Welcome to ThrottleX API"
}
```

### Auth

`POST /api/auth/register`

```json
{
  "name": "Acme Inc",
  "email": "owner@acme.com",
  "password": "StrongPass123!",
  "accountType": "test"
}
```

Notes:

- `accountType` must be `test` or `live`
- Email is normalized to lowercase

`POST /api/auth/login`

```json
{
  "email": "owner@acme.com",
  "password": "StrongPass123!"
}
```

Response includes:

- `tenant`
- `accessToken`
- `refreshToken` cookie

`POST /api/auth/refresh`

- Requires the `refreshToken` cookie
- Returns a new access token
- Rotates the refresh token cookie

`POST /api/auth/logout`

- Uses the `refreshToken` cookie when present
- Blacklists the provided bearer access token when present

### Tenant

All tenant routes require `Authorization: Bearer <accessToken>`.

`POST /api/tenant/send`

- Generates a one-time password
- Stores a hashed OTP in Redis for 5 minutes
- Sends the OTP to the tenant email via AWS SES

`POST /api/tenant/verify`

```json
{
  "otp": "123456"
}
```

- Verifies the OTP using constant-time comparison
- Marks the tenant as verified

`GET /api/tenant/profile`

- Returns the authenticated tenant profile

### API Keys

All API key routes require `Authorization: Bearer <accessToken>`.

`POST /api/apikey/generate`

- Generates a tenant API key
- Returns the raw API key once
- Stores only the hashed key in MongoDB
- Uses prefix `sk_test` or `sk_live` based on the tenant account type

`POST /api/apikey/revoke`

```json
{
  "keyId": "your-key-id"
}
```

- Marks the specified key as revoked

## Response Shape

Successful controller responses use a shared wrapper:

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": {}
}
```

## Rate Limits

- Global API: 1000 requests per IP per 60 minutes
- Register: 5 requests per IP per 15 minutes
- Login: 10 requests per IP per 10 minutes
- Send OTP: 3 requests per IP per 10 minutes
- Verify OTP: 10 requests per IP per 10 minutes
- API key generate/revoke: 5 requests per IP per 60 minutes

## Development Notes

- `npm test` is defined in `package.json`, but there are currently no test files in the repository.
- `dockerfile` exists, but the repo does not currently document a container workflow.

## Common Issues

- `Config validation error`: check missing or invalid `.env` values.
- `Origin not allowed by CORS`: add your frontend origin to `CORS_ORIGIN`.
- `Cross-site cookie request blocked`: ensure refresh/logout requests originate from an allowed frontend origin.
- `Refresh token missing`: send cookies from the client with `credentials: "include"` or `withCredentials: true`.
- Redis connection failures: verify `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.
- SES delivery issues: verify AWS credentials, SES region, and sender identity.

## Security Notes

- Use strong JWT secrets of at least 32 characters.
- Do not commit real credentials.
- Set `NODE_ENV=production` in production deployments.
- Serve the API over HTTPS in production so secure cookies work correctly.
