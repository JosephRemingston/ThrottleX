import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import connectDB from './database/database.js';
import authRoutes from "./api/routes/auth.routes.js";
import tenantRoutes from "./api/routes/tenant.routes.js";
import { apiLimiter } from "./api/middleware/ratelimiter.middleware.js";

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
app.use(cors(corsOptions));
app.use(apiLimiter);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth" , authRoutes);
app.use("/api/tenant", tenantRoutes);

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