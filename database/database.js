import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI;

	if (!mongoUri) {
		throw new Error('MongoDB URI is missing. Set MONGO_URI or MONGODB_URI.');
	}

	await mongoose.connect(mongoUri);
	console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export default connectDB;
