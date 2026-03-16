import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleAdminGet } from "./server/adminEndpoint.js";

function adminApiPlugin() {
  return {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use("/api/admin", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed." }));
          return;
        }

        try {
          const origin = `http://${req.headers.host}`;
          const request = new Request(new URL(req.url, origin), {
            method: req.method,
            headers: req.headers
          });
          const response = await handleAdminGet(request);
          const text = await response.text();

          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.end(text);
        } catch (error) {
          console.error("/api/admin middleware failed", error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to load admin data." }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.SUPABASE_URL = env.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    plugins: [react(), adminApiPlugin()]
  };
});
