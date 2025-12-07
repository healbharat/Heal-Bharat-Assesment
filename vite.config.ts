import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Vite Config
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    server: {
      port: 3000,
      host: "0.0.0.0",
    },

    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.VITE_GEMINI_API_KEY),
      "process.env.API_KEY": JSON.stringify(env.VITE_GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      }
    },

    optimizeDeps: {
      include: ["lucide-react"], // FIX: Render error (lucide-react missing during optimize)
    },

    build: {
      outDir: "dist",          // Render static site build folder
      sourcemap: false,
      rollupOptions: {
        // Do NOT externalize lucide-react → must be bundled
        external: [],
      }
    }
  };
});
