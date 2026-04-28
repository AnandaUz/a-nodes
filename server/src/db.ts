import mongoose from 'mongoose';

export const connectDB = async () => {
    const MONGO_URI = process.env.MONGODB_URI;

    if (!MONGO_URI) {
        console.error('MONGODB_URI is not defined in .env file');
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: process.env.MONGODB_BASE_NAME as string
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
