import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectDB from './database/database.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api//auth" , authRoutes);

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