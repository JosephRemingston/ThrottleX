# Local Development Setup

## Quick Start with Docker Compose

The easiest way to get started is using Docker Compose, which sets up MongoDB, Redis, and the API together.

### Prerequisites
- Docker and Docker Compose installed
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd ThrottleX
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your AWS credentials:
   ```env
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_SES_REGION=us-east-1
   AWS_SES_SOURCE_EMAIL=your-email@example.com
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

   This starts:
   - MongoDB on `localhost:27017`
   - Redis on `localhost:6379`
   - API on `localhost:3000`

4. **Verify health**
   ```bash
   curl http://localhost:3000/health
   ```

5. **View logs**
   ```bash
   docker-compose logs -f api
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

---

## Manual Setup (Without Docker)

### Prerequisites
- Node.js 18+ 
- MongoDB (local or remote)
- Redis (local or remote)
- npm

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   ```

   Update variables for your local setup:
   ```env
   MONGO_URI=mongodb://localhost:27017/throttleux
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
   REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
   ```

3. **Start MongoDB** (if using local)
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   ```

4. **Start Redis** (if using local)
   ```bash
   # macOS with Homebrew
   brew services start redis

   # Or using Docker
   docker run -d -p 6379:6379 --name redis redis:7
   ```

5. **Start the API server**
   ```bash
   npm run dev
   ```

   Server will start on `http://localhost:3000`

6. **Verify it's running**
   ```bash
   curl http://localhost:3000/health
   ```

---

## Generate Secrets

For production-grade secrets, use:

```bash
# Access Token Secret
openssl rand -hex 32

# Refresh Token Secret  
openssl rand -hex 32

# CSRF Token (generated automatically)
```

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API with nodemon (auto-reload) |
| `npm start` | Start API without auto-reload |
| `npm test` | Run all tests |
| `npm test -- --watch` | Run tests in watch mode |
| `docker-compose up -d` | Start all services |
| `docker-compose logs -f api` | View API logs |
| `docker-compose down` | Stop all services |

---

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
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

### Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "tenantName": "My Company"
  }'
```

### Get CSRF Token
```bash
curl -X POST http://localhost:3000/api/auth/csrf-token \
  -H "Content-Type: application/json" \
  -c cookies.txt
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongo --version
brew services list | grep mongodb

# Reset MongoDB
docker rm -f mongodb
docker run -d -p 27017:27017 --name mongodb mongo:7
```

### Redis Connection Issues
```bash
# Check Redis connection
redis-cli ping

# Reset Redis
docker rm -f redis
docker run -d -p 6379:6379 --name redis redis:7
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 27017
lsof -i :27017 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Environment Variable Not Found
- Ensure `.env` file exists in root directory
- Reload terminal after updating `.env`
- Check variable names match exactly (case-sensitive)

---

## Next Steps

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Review [API Documentation](./docs/API.md) for endpoints
- Check [System Design](./docs/system-design.mmd) for architecture
