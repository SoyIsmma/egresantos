import { defineConfig } from "vite";
import path from "path";

// Configuramos valores por defecto para que no falle en Netlify
const port = process.env.PORT ? Number(process.env.PORT) : 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  root: path.resolve(import.meta.dirname),
  publicDir: "public",
  build: {
    // Ajustamos la salida para que Netlify la encuentre fácil
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        admin: path.resolve(import.meta.dirname, "admin.html"),
        scanner: path.resolve(import.meta.dirname, "scanner.html"),
      },
    },
  },
  server: {
    port,
    strictPort: false, // Cambiado a false para evitar bloqueos
    host: "0.0.0.0",
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});
