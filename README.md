# ThrottleX API

> **Production-ready** multi-tenant configuration and canary deployment management system with automated rollout monitoring, built with Express 5, MongoDB, and Redis.

ThrottleX provides comprehensive API infrastructure for managing feature flags, configurations, and canary deployments across distributed servers. It includes multi-tenant authentication, API key management, automated rollout monitoring with health-based rollback, and detailed metrics aggregation.

---

## ⭐ Key Features

### Authentication & Security
- ✅ Multi-tenant registration and login with JWT tokens
- ✅ Rotating refresh tokens with Redis persistence
- ✅ Access token blacklisting on logout
- ✅ CSRF protection on all state-changing operations
- ✅ Secure password hashing with bcrypt
- ✅ OTP verification via AWS SES

### Configuration Management
- ✅ Version-controlled config rollout
- ✅ Rollout percentage control (canary deployments)
- ✅ Hash-based config distribution to servers
- ✅ Tenant-scoped API key management
- ✅ Test/Live key separation

### Server Monitoring
- ✅ Server registration and polling
- ✅ Real-time metrics ingestion (error rate, latency, crashes)
- ✅ Automated rollback on error thresholds
- ✅ Progressive canary advancement
- ✅ Stale server cleanup
- ✅ Email alerts via AWS SES

### Operations & Reliability
- ✅ Health check endpoint with dependency monitoring
- ✅ Structured JSON logging
- ✅ Graceful shutdown with connection cleanup
- ✅ Rate limiting (global and per-endpoint)
- ✅ CORS protection with origin validation
- ✅ Production-ready Docker image

---

## 🚀 Quick Start

### Option A: Docker Compose (Recommended)
```bash
# Clone and setup
git clone <repo>
cd ThrottleX
cp .env.example .env

# Start everything (MongoDB, Redis, API)
docker-compose up -d

# Verify health
curl http://localhost:3000/health
```

### Option B: Manual Setup
```bash
npm install
cp .env.example .env
npm run dev
```

See [SETUP.md](./SETUP.md) for detailed instructions.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[docs/API.md](./docs/API.md)** | 📋 Complete API reference with 20+ endpoints and examples |

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ (ES Modules) |
| **Framework** | Express 5 |
| **Database** | MongoDB with Mongoose ODM |
| **Cache** | Redis with ioredis |
| **Auth** | JWT (jsonwebtoken) |
| **Email** | AWS SES v3 SDK |
| **Utilities** | Joi, bcrypt, express-rate-limit |
| **Testing** | Jest with supertest |
| **Container** | Docker with multi-stage build |

---

## 📊 Core Endpoints

### Authentication
- `POST /api/auth/register` - Register tenant account
- `POST /api/auth/login` - Login and receive tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and blacklist token
- `POST /api/auth/csrf-token` - Get CSRF token

### API Keys
- `POST /api/apikey/generate` - Generate API key (test/live)
- `GET /api/apikey/list` - List all API keys
- `POST /api/apikey/revoke/:keyId` - Revoke API key

### Configuration
- `POST /api/config/create` - Create new config version
- `GET /api/config/list` - List all configs
- `PUT /api/config/status/:configId` - Update rollout percentage
- `GET /api/config/:configId` - Get config details

### Server Operations
- `POST /api/poll/register` - Register server
- `POST /api/poll/config` - Poll for latest config
- `POST /api/metrics/submit` - Submit server metrics
- `GET /api/metrics/summary` - Get aggregated metrics

### Health & Status
- `GET /health` - Health check with dependency status
- `GET /` - Welcome message

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                     │
│          (Web Browsers, Backend Services, Servers)          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP JSON + Cookies
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 ThrottleX Express API                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Middleware: CORS • Rate Limit • Auth • Error Handler │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐    │
│  │    Controllers: Auth • Tenant • Config • Metrics    │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Services: HashService • RolloutMonitor • Utilities  │    │
│  └────────────────────────────────────────────────────┘    │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────┐        ┌─────────┐      ┌──────────┐
    │ MongoDB │        │ Redis   │      │ AWS SES  │
    │(Persist)│        │(Session)│      │(Email)   │
    └─────────┘        └─────────┘      └──────────┘
```

---

## 🛠️ NPM Scripts

```bash
npm run dev              # Development with auto-reload (nodemon)
npm start               # Production start
npm test                # Run all tests (unit + integration)
npm run test:watch      # Tests in watch mode
npm run test:integration # Run integration tests only
npm run lint            # Check code quality (ESLint)
npm run format          # Auto-format code (Prettier)
```

---

## 📝 Environment Setup

### Using `.env.example`
```bash
cp .env.example .env
```

### Required Variables
```env
MONGO_URI=mongodb://localhost:27017/throttleux
ACCESS_TOKEN_SECRET=your-32-char-minimum-secret
REFRESH_TOKEN_SECRET=your-32-char-minimum-secret
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_SES_REGION=us-east-1
AWS_SES_SOURCE_EMAIL=noreply@example.com
```

### Generate Secrets
```bash
openssl rand -hex 32  # For token secrets
```

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Integration Tests
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

Test coverage includes:
- ✅ Authentication workflows
- ✅ API key lifecycle
- ✅ Configuration management
- ✅ Error handling
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation

---

## 🚢 Deployment

### Docker
```bash
docker build -t throttlex:1.0.0 .
docker run -p 3000:3000 throttlex:1.0.0
```

---

## 🔒 Security Features

- ✅ **Non-root Docker user** - Containers run as non-privileged user
- ✅ **HTTPS ready** - Use reverse proxy (nginx, ALB) for TLS
- ✅ **Input validation** - Joi schemas on all endpoints
- ✅ **Rate limiting** - Global and per-endpoint protection
- ✅ **CSRF protection** - Token validation on state changes
- ✅ **Password hashing** - bcrypt with 10 rounds
- ✅ **JWT secrets** - Minimum 32 characters required
- ✅ **Graceful shutdown** - Proper connection cleanup on signals
- ✅ **Error handling** - No sensitive data in error responses (dev mode only)

---

## 💡 Key Concepts

### Multi-Tenant Design
Each tenant maintains isolated:
- API keys (test/live scoped)
- Configurations (versions)
- Servers (polling clients)
- Metrics (aggregated per server)

### Canary Deployment
Gradually rollout configs to servers based on percentage:
- Start at 0% (disabled)
- Increment in 20% steps
- Monitor error rates
- Auto-rollback if thresholds exceeded
- Full rollout at 100%

### Health Monitoring
Server metrics tracked continuously:
- Error rate (crashes, exceptions)
- Latency (response times)
- Request count
- Stale detection (5+ min no poll)

### JWT Token Flow
1. Register/Login → Issue `accessToken` + `refreshToken`
2. Store refresh token in Redis (7d TTL)
3. Use access token for requests (15m TTL)
4. Before expiry, refresh token to get new access token
5. On logout, blacklist current token

---

## 📈 Monitoring & Logging

### Health Endpoint
```bash
curl http://localhost:3000/health
```

Response includes:
- Overall status (ok/degraded/unhealthy)
- Database connectivity
- Redis connectivity
- Timestamp

### Structured Logging
All logs output as JSON for easy aggregation:
```json
{
  "timestamp": "2024-04-23T10:30:00.000Z",
  "level": "INFO",
  "message": "Server started",
  "data": { "port": 3000 }
}
```

Compatible with:
- ELK Stack
- Datadog
- CloudWatch
- Splunk

---

## 🛑 Graceful Shutdown

The API properly handles shutdown signals:
- Closes HTTP server (no new requests)
- Completes in-flight requests
- Closes MongoDB connections
- Closes Redis connections
- 30-second timeout before forced exit

```bash
# Send SIGTERM (docker stop, systemd, k8s)
kill -TERM <pid>

# Send SIGINT (Ctrl+C in terminal)
^C
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Testing requirements
- Commit message format
- Pull request process
- Performance considerations

---

## 📞 Support & Troubleshooting

### Common Issues
- **Port already in use** → See [QUICKREF.md](./QUICKREF.md) troubleshooting
- **MongoDB connection failed** → See [SETUP.md](./SETUP.md) troubleshooting
- **Redis connection failed** → See [SETUP.md](./SETUP.md) troubleshooting
- **Environment variable not found** → Verify `.env` exists and reload terminal

### Get Help
1. **Quick answers** → [QUICKREF.md](./QUICKREF.md)
2. **Setup issues** → [SETUP.md](./SETUP.md)
3. **API questions** → [docs/API.md](./docs/API.md)
4. **Development** → [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📦 Project Structure

```
ThrottleX/
├── api/                    # Application code
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware (CORS, Auth, RateLimit)
│   ├── models/             # MongoDB schemas (Mongoose)
│   ├── routes/             # Route definitions
│   ├── services/           # Business logic (HashService, etc)
│   └── utils/              # Utilities (logger, health, errors)
├── database/               # DB connections (MongoDB, Redis)
├── jobs/                   # Background jobs (rollout monitor)
├── tests/                  # Unit and integration tests
├── docs/                   # Documentation (API, architecture)
├── config/                 # Configuration (env validation)
├── dockerfile              # Production Docker image
├── docker-compose.yml      # Local development stack
├── package.json            # Dependencies and scripts
├── index.js                # Application entry point
├── .env.example            # Environment template
├── SETUP.md                # Local development guide
├── DEPLOYMENT.md           # Production deployment guide
├── CONTRIBUTING.md         # Contributing guidelines
├── QUICKREF.md             # Quick command reference
├── IMPROVEMENTS.md         # Summary of improvements
└── README.md               # This file
```

---

## ✨ What's New

This version includes several production-ready improvements:

- ✅ **Production Docker image** with multi-stage builds
- ✅ **Comprehensive documentation** (setup, deployment, API, contributing)
- ✅ **Health check system** monitoring dependencies
- ✅ **Graceful shutdown** handling
- ✅ **Structured logging** with JSON output
- ✅ **Docker Compose** for local development
- ✅ **Integration tests** covering key workflows
- ✅ **Code quality tools** (ESLint, Prettier)

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for detailed change summary.

---

## 📄 License

ISC

---

## 🎯 Status

✅ **Production Ready** - Fully tested and documented

Last Updated: April 2024
