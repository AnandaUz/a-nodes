import { defineConfig } from 'vite';
import { resolve } from 'path';


export default defineConfig({
  css: {
      devSourcemap: true,
  },
  server: {
    
    proxy: {
      // Все запросы, начинающиеся с /api, будут перенаправлены на сервер
      '/api': {
        target: 'http://localhost:3000', // Адрес твоего Node.js сервера
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // Убирает /api из пути перед отправкой
      }
    }
  },
  resolve: {
    alias: {
      // Теперь символ @ заменяет путь до папки src
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@assets': resolve(__dirname, './src/assets'),
      '@styles': resolve(__dirname, './src/styles'),
      '@shared': resolve(__dirname, '../shared'),
      '@services': resolve(__dirname, './src/services'),
      '@features': resolve(__dirname, './src/features'),
    },
  },
  build: {
    assetsInlineLimit: 4096, // файлы меньше 4kb встраиваются как base64
  }
});