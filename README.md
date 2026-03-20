# ThrottleX API

ThrottleX is a Node.js + Express authentication API with:
- tenant registration and login
- JWT access + refresh token flow
- Redis-backed refresh token storage
- MongoDB-backed tenant persistence
- request rate limiting

## Tech Stack

- Node.js (ES modules)
- Express
- MongoDB + Mongoose
- Redis (ioredis)
- JWT (jsonwebtoken)

## Project Structure

```
.
|-- index.js
|-- api/
|   |-- controllors/
|   |   |-- auth.controllor.js
|   |-- middleware/
|   |   |-- auth.middleware.js
|   |   |-- ratelimiter.middleware.js
|   |-- models/
|   |   |-- tenant.models.js
|   |-- routes/
|   |   |-- auth.routes.js
|   |-- utils/
|       |-- ApiError.js
|       |-- ApiResponse.js
|       |-- asyncHandler.js
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

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/throttlex

# Comma-separated list of allowed origins for CORS
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT secrets (set strong random values in real environments)
ACCESS_TOKEN_SECRET=replace-with-a-strong-secret
REFRESH_TOKEN_SECRET=replace-with-a-strong-secret

# Optional
NODE_ENV=development
```

## Install and Run

```bash
npm install
npm run dev
```

Production mode:

```bash
npm start
```

Server default URL:

```text
http://localhost:3000
```

## API Base URL

All auth endpoints are mounted under:

```text
/api/auth
```

So for local development:

```text
http://localhost:3000/api/auth
```

## Response Format

Success responses generally use:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {}
}
```

Validation and runtime errors are returned by `asyncHandler` and include details such as:

```json
{
  "message": "...",
  "cause": [],
  "error": {},
  "icon": "error"
}
```

Rate-limit responses return the configured limiter message.

## Rate Limits

- Global API limiter: 1000 requests per IP per 60 minutes
- Register limiter: 5 requests per IP per 15 minutes
- Login limiter: 10 requests per IP per 10 minutes

## Authentication and Token Flow

1. Register tenant.
2. Login with email/password.
3. Receive:
   - `accessToken` in JSON response
   - `refreshToken` in an `HttpOnly` cookie
4. Send `Authorization: Bearer <accessToken>` to protected endpoints.
5. When access token expires, call `POST /api/auth/refresh` with cookies included.
6. On logout, server deletes refresh token in Redis and clears cookie.

Important:
- Frontend must send cookies with `credentials: "include"` (fetch) or `withCredentials: true` (Axios) for refresh/logout.
- If frontend runs on a different origin, ensure it is included in `CORS_ORIGIN`.

## Endpoint Usage

### 1) Health/Welcome

- Method: `GET`
- Path: `/`
- Description: service welcome endpoint

Example:

```bash
curl -X GET http://localhost:3000/
```

### 2) Register

- Method: `POST`
- Path: `/api/auth/register`
- Rate limit: 5 requests / 15 minutes per IP

Request body:

```json
{
  "name": "Acme Inc",
  "email": "owner@acme.com",
  "password": "StrongPass123!",
  "accountType": "test"
}
```

Rules:
- `name`, `email`, `password` are required
- `accountType` must be `test` or `live`

Example:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Inc",
    "email": "owner@acme.com",
    "password": "StrongPass123!",
    "accountType": "test"
  }'
```

### 3) Login

- Method: `POST`
- Path: `/api/auth/login`
- Rate limit: 10 requests / 10 minutes per IP

Request body:

```json
{
  "email": "owner@acme.com",
  "password": "StrongPass123!"
}
```

Response includes:
- `accessToken` in response body
- `refreshToken` in `HttpOnly` cookie

Example:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@acme.com",
    "password": "StrongPass123!"
  }'
```

### 4) Refresh Access Token

- Method: `POST`
- Path: `/api/auth/refresh`
- Requires: `refreshToken` cookie

Behavior:
- verifies refresh token
- validates token against Redis
- rotates refresh token
- sets a new refresh cookie
- returns a new access token

Example:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  --cookie "refreshToken=<your-refresh-token>"
```

### 5) Logout

- Method: `POST`
- Path: `/api/auth/logout`
- Requires: refresh cookie (if absent, returns success anyway)

Behavior:
- deletes refresh token from Redis (when decodable)
- clears refresh cookie

Example:

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  --cookie "refreshToken=<your-refresh-token>"
```

## Frontend Integration Guide

### Using Fetch

```js
const API_BASE = "http://localhost:3000/api/auth";
let accessToken = null;

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // required for refresh cookie
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  accessToken = data?.data?.accessToken;
  return data;
}

export async function refreshAccessToken() {
  const res = await fetch(`${API_BASE}/refresh`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Refresh failed");
  accessToken = data?.data?.accessToken;
  return accessToken;
}

export async function apiRequest(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };

  let res = await fetch(url, { ...options, headers, credentials: "include" });

  // Retry once after refresh on 401
  if (res.status === 401) {
    await refreshAccessToken();
    const retryHeaders = {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };
    res = await fetch(url, {
      ...options,
      headers: retryHeaders,
      credentials: "include"
    });
  }

  return res;
}
```

### Using Axios

```js
import axios from "axios";

const authApi = axios.create({
  baseURL: "http://localhost:3000/api/auth",
  withCredentials: true
});

let accessToken = null;

authApi.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshRes = await authApi.post("/refresh");
      accessToken = refreshRes.data?.data?.accessToken;

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return authApi(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default authApi;
```

## Common Issues

1. `Refresh token missing`
   - Ensure requests use `credentials: "include"` or `withCredentials: true`.

2. `Origin not allowed by CORS`
   - Add your frontend URL to `CORS_ORIGIN`.

3. Redis errors
   - Confirm `REDIS_HOST`, `REDIS_PORT`, and optional password.

4. MongoDB connection failure
   - Verify `MONGO_URI` and network access.

## Security Notes

- Use strong, unique values for JWT secrets.
- Do not commit real secrets to source control.
- Rotate exposed credentials and secrets if they were ever committed.
