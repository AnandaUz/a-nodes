import mongoose from 'mongoose';
import dns from 'dns';

// В облачных контейнерах (Cloud Run) переопределение DNS ломает резолв SRV-записей Atlas
if (process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE) {
    try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
        // игнорируем ошибку настройки DNS
    }
}

export const isDbReady = () => mongoose.connection.readyState === 1;

export const connectDB = async () => {
    const MONGO_URI = process.env.MONGODB_URI;

    if (!MONGO_URI) {
        console.error('MONGODB_URI is not defined in .env file');
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: process.env.MONGODB_BASE_NAME as string,
            serverSelectionTimeoutMS: 8000,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error(
            'MongoDB connection error (проверьте IP whitelist в Atlas / VPN / интернет). Повтор через 10с:',
            (error as Error).message,
        );
        setTimeout(connectDB, 10000);
    }
};
