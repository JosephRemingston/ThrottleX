import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './database/database.js';
import { validateEnv } from './config/env.js';
import authRoutes from "./api/routes/auth.routes.js";
import tenantRoutes from "./api/routes/tenant.routes.js";
import apiKeyRoutes from "./api/routes/apiKey.routes.js";
import configRoutes from "./api/routes/config/config.routes.js";
import pollRoutes from "./api/routes/config/poll.routes.js";
import metricsRoutes from "./api/routes/config/metrics.routes.js";
import { apiLimiter } from "./api/middleware/ratelimiter.middleware.js";
import errorHandler from "./api/middleware/error.middleware.js";
import { verifyCsrfToken } from "./api/middleware/csrf.middleware.js";

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

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ThrottleX API' });
});

// Start server only after MongoDB is connected
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
