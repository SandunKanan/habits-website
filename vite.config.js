import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { getAuthenticatedUserFromAccessToken, isServerAuthEnabled } from "./server/authUser.js";
import { loadHabitsFromStore, saveHabitsToStore } from "./server/habitsStore.js";

function habitsPersistencePlugin() {
  return {
    name: "habits-persistence-api",
    configureServer(server) {
      server.middlewares.use("/api/habits", async (req, res) => {
        if (req.method !== "GET" && req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
          return;
        }

        try {
          let authUser = null;
          if (isServerAuthEnabled()) {
            const authHeader = req.headers.authorization;
            const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
            const auth = await getAuthenticatedUserFromAccessToken(accessToken);
            if (auth?.error) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: auth.error }));
              return;
            }

            authUser = auth?.user ?? null;
          }

          if (req.method === "GET") {
            const habits = await loadHabitsFromStore(authUser?.id);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ habits }));
            return;
          }

          let body = "";
          for await (const chunk of req) body += chunk;

          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Payload must be an array" }));
            return;
          }

          const habits = await saveHabitsToStore(authUser?.id, parsed);

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ habits }));
        } catch (error) {
          console.error("/api/habits middleware failed", error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Failed to persist habits data" }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.SUPABASE_URL = env.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    plugins: [react(), habitsPersistencePlugin()]
  };
});
