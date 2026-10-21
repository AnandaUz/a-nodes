import dotenv from 'dotenv';
import path from 'path';

// Подгружаем переменные окружения
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Переключатель БД: DB_MODE=cloud|local
const mode = (process.env.DB_MODE || 'cloud').toLowerCase();
const resolvedUri = mode === 'local' ? process.env.MONGODB_URI_LOCAL : process.env.MONGODB_URI_CLOUD;
process.env.MONGODB_URI = resolvedUri || process.env.MONGODB_URI;

console.log(`[db] mode: ${mode}, hasUri: ${Boolean(process.env.MONGODB_URI)}`);
