# Production Deployment Guide

## Deployment Strategies

ThrottleX can be deployed using multiple strategies. Choose the one that fits your infrastructure.

---

## 1. Docker Container (Recommended)

### Build Image

```bash
docker build -t throttlex:latest .
```

### Run Container

```bash
docker run -d \
  --name throttlex-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGO_URI=mongodb://db.example.com:27017/throttleux \
  -e REDIS_HOST=redis.example.com \
  -e REDIS_PORT=6379 \
  -e ACCESS_TOKEN_SECRET=$(openssl rand -hex 32) \
  -e REFRESH_TOKEN_SECRET=$(openssl rand -hex 32) \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e AWS_SES_REGION=us-east-1 \
  -e AWS_SES_SOURCE_EMAIL=noreply@example.com \
  throttlex:latest
```

### Container Registry

Push to Docker Hub, AWS ECR, or Azure Container Registry:

```bash
# Docker Hub
docker tag throttlex:latest username/throttlex:1.0.0
docker push username/throttlex:1.0.0

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag throttlex:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/throttlex:1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/throttlex:1.0.0
```

---

## 2. Kubernetes Deployment

### Create Namespace

```bash
kubectl create namespace throttlex-prod
```

### Create ConfigMap for Environment Variables

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: throttlex-config
  namespace: throttlex-prod
data:
  NODE_ENV: "production"
  MONGO_URI: "mongodb://mongodb-service:27017/throttleux"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  AWS_SES_REGION: "us-east-1"
  CORS_ORIGIN: "https://app.example.com"
```

### Create Secret for Sensitive Data

```bash
kubectl create secret generic throttlex-secrets \
  --from-literal=ACCESS_TOKEN_SECRET=$(openssl rand -hex 32) \
  --from-literal=REFRESH_TOKEN_SECRET=$(openssl rand -hex 32) \
  --from-literal=AWS_ACCESS_KEY_ID=your_key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your_secret \
  --from-literal=AWS_SES_SOURCE_EMAIL=your_email@example.com \
  -n throttlex-prod
```

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: throttlex-api
  namespace: throttlex-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: throttlex-api
  template:
    metadata:
      labels:
        app: throttlex-api
    spec:
      containers:
      - name: api
        image: your-registry/throttlex:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: throttlex-config
        - secretRef:
            name: throttlex-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 2
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - throttlex-api
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: throttlex-api-service
  namespace: throttlex-prod
spec:
  selector:
    app: throttlex-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Deploy

```bash
kubectl apply -f k8s-deployment.yaml
kubectl get pods -n throttlex-prod
kubectl logs -f deployment/throttlex-api -n throttlex-prod
```

---

## 3. AWS Elastic Container Service (ECS)

### Create Task Definition

```json
{
  "family": "throttlex-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "throttlex-api",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/throttlex:1.0.0",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MONGO_URI",
          "value": "mongodb://your-mongodb-host:27017/throttleux"
        }
      ],
      "secrets": [
        {
          "name": "ACCESS_TOKEN_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:throttlex/token-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/throttlex-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
```

### Create Service

```bash
aws ecs create-service \
  --cluster throttlex-prod \
  --service-name throttlex-api \
  --task-definition throttlex-api:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
```

---

## 4. Heroku Deployment

### Prerequisites
- Heroku CLI installed
- Git repository

### Steps

```bash
# Login to Heroku
heroku login

# Create app
heroku create throttlex-api

# Set environment variables
heroku config:set \
  NODE_ENV=production \
  MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/throttleux \
  REDIS_URL=redis://user:pass@host:port \
  ACCESS_TOKEN_SECRET=$(openssl rand -hex 32) \
  REFRESH_TOKEN_SECRET=$(openssl rand -hex 32) \
  AWS_ACCESS_KEY_ID=your_key \
  AWS_SECRET_ACCESS_KEY=your_secret \
  AWS_SES_REGION=us-east-1 \
  AWS_SES_SOURCE_EMAIL=your_email@example.com

# Update Procfile
echo "web: npm start" > Procfile

# Deploy
git push heroku main

# View logs
heroku logs -t
```

---

## Best Practices

### Security

1. **Environment Variables**
   - Use strong secrets (min 32 chars)
   - Store in secrets management (AWS Secrets Manager, Azure Key Vault)
   - Never commit `.env` files
   - Rotate secrets regularly

2. **HTTPS**
   - Always use HTTPS in production
   - Use valid SSL certificates
   - Set `HSTS` headers in production

3. **Rate Limiting**
   - Configure appropriate rate limits
   - Use stricter limits for auth endpoints
   - Implement IP-based rate limiting

4. **CORS**
   - Whitelist only trusted origins
   - Avoid `*` in production
   - Use secure cookie flags

```javascript
const corsOptions = {
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Database & Cache

1. **MongoDB**
   - Enable authentication
   - Use connection pooling
   - Create indexes for frequently queried fields
   - Set up replication for HA
   - Enable backup and encryption at rest

2. **Redis**
   - Require password authentication
   - Use Redis Cluster or Sentinel for HA
   - Set memory eviction policies
   - Enable AOF persistence
   - Monitor memory usage

### Monitoring & Logging

1. **Logging**
   - Use structured JSON logging
   - Aggregate logs (ELK Stack, CloudWatch, Datadog)
   - Set appropriate log levels per environment
   - Monitor for errors and warnings

2. **Health Checks**
   - Deploy `/health` endpoint monitoring
   - Configure proper health check intervals
   - Use for load balancer routing

3. **Metrics**
   - Track response times
   - Monitor error rates
   - Watch database connection pool
   - Alert on threshold violations

### Scaling

1. **Horizontal Scaling**
   - Ensure stateless design (JWT tokens)
   - Use load balancer
   - Configure auto-scaling policies

2. **Caching**
   - Cache config data in Redis
   - Implement cache invalidation
   - Set appropriate TTLs

---

## Monitoring Checklist

- [ ] Health endpoint responding
- [ ] Logs being collected
- [ ] Database performance acceptable
- [ ] Redis memory usage normal
- [ ] Error rates below threshold
- [ ] Response times acceptable
- [ ] Backup strategy in place
- [ ] Security patches applied

---

## Rollback Procedure

### Docker
```bash
docker pull throttlex:previous-version
docker stop throttlex-api
docker run -d --name throttlex-api throttlex:previous-version
```

### Kubernetes
```bash
kubectl rollout history deployment/throttlex-api -n throttlex-prod
kubectl rollout undo deployment/throttlex-api -n throttlex-prod --to-revision=2
```

### ECS
```bash
# Update service to previous task definition
aws ecs update-service --cluster throttlex-prod --service throttlex-api --task-definition throttlex-api:3
```

---

## Support

For issues or questions:
- Check logs: See "Monitoring & Logging" section
- Run `/health` endpoint
- Verify all environment variables are set
- Check database and Redis connectivity
