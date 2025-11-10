import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ replace this with your actual Render backend URL:
const backendUrl = "https://shootforarts-backend.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
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
