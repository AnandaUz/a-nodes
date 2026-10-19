import dotenv from 'dotenv';
import path from 'path';

// Используем абсолютный путь, чтобы не зависеть от того, откуда запущен сервер
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Переключатель БД: DB_MODE=cloud|local
const mode = (process.env.DB_MODE || 'cloud').toLowerCase();
process.env.MONGODB_URI =
  mode === 'local' ? process.env.MONGODB_URI_LOCAL : process.env.MONGODB_URI_CLOUD;
console.log(`[db] mode: ${mode}`);
