import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './database/database.js';
import redis from './database/redis.js';
import { validateEnv } from './config/env.js';
import { logger } from './api/utils/logger.js';
import { checkHealth, setRedisClient } from './api/utils/health.js';
import authRoutes from "./api/routes/auth.routes.js";
import tenantRoutes from "./api/routes/tenant.routes.js";
import apiKeyRoutes from "./api/routes/apiKey.routes.js";
import configRoutes from "./api/routes/config/config.routes.js";
import pollRoutes from "./api/routes/config/poll.routes.js";
import metricsRoutes from "./api/routes/config/metrics.routes.js";
import { apiLimiter } from "./api/middleware/ratelimiter.middleware.js";
import errorHandler from "./api/middleware/error.middleware.js";
import { verifyCsrfToken } from "./api/middleware/csrf.middleware.js";
import { startRolloutMonitor } from "./jobs/rolloutMonitor.js";

validateEnv();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin not allowed by CORS'));
    }
};

// Middleware
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(apiLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Apply CSRF protection to all state-changing routes
app.use(verifyCsrfToken);

app.use("/api/auth" , authRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/apikey" , apiKeyRoutes);
app.use("/api/config", configRoutes);
app.use("/api/poll", pollRoutes);
app.use("/api/metrics", metricsRoutes);

app.use(errorHandler);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = await checkHealth();
        const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 503 : 500;
        res.status(statusCode).json(health);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            message: 'Health check failed'
        });
    }
});

// Welcome endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ThrottleX API', version: '1.0.0' });
});

let server = null;
const PORT = process.env.PORT || 3000;

// Start server only after MongoDB is connected
const startServer = async () => {
    try {
        await connectDB();
        setRedisClient(redis);
        startRolloutMonitor();

        server = app.listen(PORT, () => {
            logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
        });
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logger.info('Received signal, starting graceful shutdown', { signal });

    if (server) {
        server.close(async () => {
            logger.info('HTTP server closed');
            
            try {
                // Close database connections
                const mongoose = await import('mongoose');
                await mongoose.default.connection.close(false);
                logger.info('MongoDB connection closed');
            } catch (error) {
                logger.error('Error closing MongoDB connection', { error: error.message });
            }

            try {
                // Close Redis connection
                if (redis) {
                    await redis.quit();
                    logger.info('Redis connection closed');
                }
            } catch (error) {
                logger.error('Error closing Redis connection', { error: error.message });
            }

            logger.info('Graceful shutdown complete');
            process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    process.exit(1);
});

startServer();
