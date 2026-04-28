import dotenv from 'dotenv';
import path from 'path';

// Используем абсолютный путь, чтобы не зависеть от того, откуда запущен сервер
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
