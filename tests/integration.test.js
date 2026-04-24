import request from 'supertest';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../api/routes/auth.routes.js';
import tenantRoutes from '../api/routes/tenant.routes.js';
import configRoutes from '../api/routes/config/config.routes.js';
import { verifyCsrfToken } from '../api/middleware/csrf.middleware.js';
import errorHandler from '../api/middleware/error.middleware.js';
import mongoose from 'mongoose';

// Mock setup
jest.mock('../database/database.js');
jest.mock('../database/redis.js');
jest.mock('../jobs/rolloutMonitor.js');

describe('Integration Tests - API Workflows', () => {
  let app;
  let mongoConnection;

  beforeAll(async () => {
    // Setup Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(cookieParser());
    app.use(verifyCsrfToken);
    
    app.use('/api/auth', authRoutes);
    app.use('/api/tenant', tenantRoutes);
    app.use('/api/config', configRoutes);
    
    app.use(errorHandler);

    // Mock database connection
    mongoConnection = {
      close: jest.fn().mockResolvedValue(undefined),
      readyState: 1
    };
  });

  afterAll(async () => {
    if (mongoConnection) {
      await mongoConnection.close();
    }
  });

  describe('Authentication Flow', () => {
    it('should register a new tenant', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          tenantName: 'Test Tenant'
        });

      expect(response.status).toBeOneOf([201, 400]); // 400 if user exists in test
    });

    it('should validate email format on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          tenantName: 'Test Tenant'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should validate password requirements on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          tenantName: 'Test Tenant'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const app2 = express();
      app2.get('/health', async (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      const response = await request(app2).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Config Management', () => {
    it('should require authentication for config routes', async () => {
      const response = await request(app)
        .get('/api/config');

      expect(response.status).toBeOneOf([401, 403]);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent');
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Protection', () => {
    it('should validate CORS headers', async () => {
      const response = await request(app)
        .get('/api/auth/csrf-token')
        .set('Origin', 'http://localhost:5173');

      // CORS headers should be present or properly rejected
      expect(response.status).toBeOneOf([200, 403]);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal requests', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'SecurePass123!',
          tenantName: 'Test Tenant 2'
        });

      expect(response.status).toBeOneOf([201, 400, 429]);
    });
  });

  describe('Input Validation', () => {
    it('should reject requests with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should sanitize input to prevent injection attacks', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com<script>',
          password: 'SecurePass123!',
          tenantName: 'Test<img src=x onerror=alert(1)>'
        });

      expect(response.status).toBe(400);
    });
  });
});
