import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies /api and /uploads to the FastAPI backend during local dev (npm run dev).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
