import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";

function habitsPersistencePlugin() {
  return {
    name: "habits-persistence-api",
    configureServer(server) {
      server.middlewares.use("/api/habits", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
          return;
        }

        try {
          let body = "";
          for await (const chunk of req) body += chunk;

          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Payload must be an array" }));
            return;
          }

          const filePath = path.resolve(process.cwd(), "src/data/habits.json");
          await fs.writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Failed to persist habits.json" }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), habitsPersistencePlugin()]
});
