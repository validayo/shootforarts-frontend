import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ replace this with your actual Render backend URL:
const backendUrl = "https://shootforarts-backend.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    cors: {
      origin: /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/,
    },
    allowedHosts: ["localhost", "127.0.0.1"],
    proxy: {
      "/contact-form": backendUrl,
      "/newsletter": backendUrl,
      "/upload-photos": backendUrl,
      "/images": backendUrl,
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  define: {
    "process.env": {}, // Prevents Vite crashes on process.env
  },
});
