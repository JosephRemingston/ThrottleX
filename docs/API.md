# ThrottleX API Documentation

## Base URL
```
http://localhost:3000 (development)
https://api.example.com (production)
```

## Authentication

Most endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Or via cookies (set by login/registration):
```
x-access-token: <access_token>
```

---

## Endpoints

### Authentication

#### Register Tenant

**POST** `/api/auth/register`

Register a new tenant account.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "tenantName": "My Company"
  }'
```

**Response (201)**
```json
{
  "message": "Tenant registered successfully",
  "tenant": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "tenantName": "My Company",
    "createdAt": "2024-04-23T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get CSRF Token

**POST** `/api/auth/csrf-token`

Get a CSRF token for state-changing operations.

```bash
curl -X POST http://localhost:3000/api/auth/csrf-token \
  -H "Content-Type: application/json" \
  -c cookies.txt
```

**Response (200)**
```json
{
  "csrfToken": "abc123def456..."
}
```

#### Login

**POST** `/api/auth/login`

Authenticate and get tokens.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (200)**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenant": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "tenantName": "My Company"
  }
}
```

#### Refresh Token

**POST** `/api/auth/refresh`

Get a new access token using refresh token.

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <refresh_token>" \
  -d '{}'
```

**Response (200)**
```json
{
  "message": "Token refreshed",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout

**POST** `/api/auth/logout`

Logout and blacklist tokens.

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -d '{}'
```

**Response (200)**
```json
{
  "message": "Logout successful"
}
```

---

### API Keys

#### Generate API Key

**POST** `/api/apikey/generate`

Generate a new API key (test or live).

```bash
curl -X POST http://localhost:3000/api/apikey/generate \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "keyType": "test"
  }'
```

**Response (201)**
```json
{
  "message": "API key generated successfully",
  "apiKey": {
    "_id": "507f1f77bcf86cd799439011",
    "keyPrefix": "test_abc123",
    "keyType": "test",
    "isActive": true,
    "createdAt": "2024-04-23T10:30:00.000Z"
  }
}
```

#### List API Keys

**GET** `/api/apikey/list`

Get all API keys for the tenant.

```bash
curl -X GET http://localhost:3000/api/apikey/list \
  -H "Authorization: Bearer <access_token>"
```

**Response (200)**
```json
{
  "message": "API keys retrieved successfully",
  "apiKeys": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "keyPrefix": "test_abc123",
      "keyType": "test",
      "isActive": true,
      "createdAt": "2024-04-23T10:30:00.000Z"
    }
  ]
}
```

#### Revoke API Key

**POST** `/api/apikey/revoke/:keyId`

Revoke an API key.

```bash
curl -X POST http://localhost:3000/api/apikey/revoke/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <access_token>" \
  -d '{}'
```

**Response (200)**
```json
{
  "message": "API key revoked successfully"
}
```

---

### Config Management

#### Create Config

**POST** `/api/config/create`

Create a new config version.

```bash
curl -X POST http://localhost:3000/api/config/create \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Feature Flag Config",
    "version": "1.0.0",
    "rolloutPercentage": 0,
    "config": {
      "featureA_enabled": true,
      "featureB_percentage": 50
    }
  }'
```

**Response (201)**
```json
{
  "message": "Config created successfully",
  "config": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Feature Flag Config",
    "version": "1.0.0",
    "rolloutPercentage": 0,
    "configHash": "abc123def456...",
    "createdAt": "2024-04-23T10:30:00.000Z"
  }
}
```

#### List Configs

**GET** `/api/config/list`

Get all configs for the tenant.

```bash
curl -X GET http://localhost:3000/api/config/list \
  -H "Authorization: Bearer <access_token>"
```

**Response (200)**
```json
{
  "message": "Configs retrieved successfully",
  "configs": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Feature Flag Config",
      "version": "1.0.0",
      "rolloutPercentage": 0,
      "createdAt": "2024-04-23T10:30:00.000Z"
    }
  ]
}
```

#### Update Config Status

**PUT** `/api/config/status/:configId`

Update rollout percentage for a config.

```bash
curl -X PUT http://localhost:3000/api/config/status/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rolloutPercentage": 50,
    "status": "IN_PROGRESS"
  }'
```

**Response (200)**
```json
{
  "message": "Config status updated successfully",
  "config": {
    "rolloutPercentage": 50,
    "status": "IN_PROGRESS"
  }
}
```

---

### Server Polling

#### Register Server

**POST** `/api/poll/register`

Register a server for config polling.

```bash
curl -X POST http://localhost:3000/api/poll/register \
  -H "x-api-key: test_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-1",
    "region": "us-east-1",
    "version": "1.0.0"
  }'
```

**Response (201)**
```json
{
  "message": "Server registered successfully",
  "server": {
    "_id": "507f1f77bcf86cd799439011",
    "serverId": "server-1",
    "region": "us-east-1",
    "status": "ACTIVE",
    "lastPolled": "2024-04-23T10:30:00.000Z"
  }
}
```

#### Poll Config

**POST** `/api/poll/config`

Poll for latest config (returns only if hash differs).

```bash
curl -X POST http://localhost:3000/api/poll/config \
  -H "x-api-key: test_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-1",
    "currentHash": "old_hash_abc123"
  }'
```

**Response (200)**
```json
{
  "message": "Config retrieved",
  "config": {
    "configId": "507f1f77bcf86cd799439011",
    "version": "1.0.0",
    "hash": "new_hash_def456",
    "rolloutPercentage": 50,
    "data": {
      "featureA_enabled": true,
      "featureB_percentage": 50
    }
  }
}
```

---

### Metrics

#### Submit Metrics

**POST** `/api/metrics/submit`

Submit metrics from a server.

```bash
curl -X POST http://localhost:3000/api/metrics/submit \
  -H "x-api-key: test_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-1",
    "configId": "507f1f77bcf86cd799439011",
    "errorRate": 0.02,
    "averageLatency": 45,
    "crashCount": 0,
    "requestCount": 10000
  }'
```

**Response (201)**
```json
{
  "message": "Metrics submitted successfully"
}
```

#### Get Metrics Summary

**GET** `/api/metrics/summary?configId=507f1f77bcf86cd799439011`

Get aggregated metrics for a config.

```bash
curl -X GET "http://localhost:3000/api/metrics/summary?configId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <access_token>"
```

**Response (200)**
```json
{
  "message": "Metrics summary retrieved successfully",
  "summary": {
    "configId": "507f1f77bcf86cd799439011",
    "totalServers": 5,
    "averageErrorRate": 0.015,
    "averageLatency": 42.5,
    "totalCrashes": 0,
    "period": "1h"
  }
}
```

---

### Health

#### Health Status

**GET** `/health`

Check API and dependencies health.

```bash
curl http://localhost:3000/health
```

**Response (200)**
```json
{
  "status": "ok",
  "timestamp": "2024-04-23T10:30:00.000Z",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

---

## Error Handling

All errors return standard format:

```json
{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "Email already registered"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limits

- **Global**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 10 requests per 15 minutes per IP
- **Poll endpoint**: 1000 requests per minute per API key

---

## Client Libraries

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'x-api-key': 'test_your_key_here'
  }
});

// Poll for config
const response = await client.post('/api/poll/config', {
  serverId: 'server-1',
  currentHash: 'old_hash'
});
```

### Python

```python
import requests

headers = {
    'x-api-key': 'test_your_key_here'
}

response = requests.post(
    'http://localhost:3000/api/poll/config',
    json={
        'serverId': 'server-1',
        'currentHash': 'old_hash'
    },
    headers=headers
)
```

### cURL

```bash
curl -X POST http://localhost:3000/api/poll/config \
  -H "x-api-key: test_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"serverId":"server-1","currentHash":"old_hash"}'
```

---

## Support

- GitHub Issues: [Report bugs](https://github.com/your-org/throttlex/issues)
- Documentation: [Setup Guide](./SETUP.md), [Deployment Guide](./DEPLOYMENT.md)
