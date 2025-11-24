/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        'dist/',
        '.eslintrc.js',
        'vite.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // enables @ to point to src
      "@app": path.resolve(__dirname, "./app"),
      "@components": path.resolve(__dirname, "./app/components"),
      "@pages": path.resolve(__dirname, "./app/pages")
    },
  },
  server: {
    proxy: {
      // ✅ Proxy rule to fix CORS for LibreTranslate
      "/translate": {
        target: "https://libretranslate.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/translate/, "/translate"),
      },
    },
  },
});
