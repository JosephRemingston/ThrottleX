import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;

	if (!mongoUri) {
		console.error('MongoDB URI is missing. Set MONGO_URI in your environment.');
		process.exit(1);
	}

	try {
		await mongoose.connect(mongoUri);
		console.log(`MongoDB connected: ${mongoose.connection.host}`);
	} catch (error) {
		console.error('MongoDB connection error:', error);
		process.exit(1);
	}

	mongoose.connection.on('disconnected', () => {
		console.log('MongoDB disconnected.');
	});

	process.on('SIGINT', async () => {
		await mongoose.connection.close();
		console.log('MongoDB connection closed due to app termination.');
		process.exit(0);
	});
};

export default connectDB;
