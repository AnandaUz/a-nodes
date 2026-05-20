import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  css: {
    devSourcemap: true,
  },
  resolve: {
    alias: {
      // Теперь символ @ заменяет путь до папки src
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@pages": resolve(__dirname, "./src/pages"),
      "@assets": resolve(__dirname, "./src/assets"),
      "@styles": resolve(__dirname, "./src/styles"),
      "@shared": resolve(__dirname, "../shared"),
      "@base": resolve(__dirname, "../_base"),
      "@services": resolve(__dirname, "./src/services"),
      "@features": resolve(__dirname, "./src/features"),
    },
  },
  build: {
    assetsInlineLimit: 4096, // файлы меньше 4kb встраиваются как base64
  },
});
