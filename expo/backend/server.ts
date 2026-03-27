import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  })
);

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

const distPath = path.join(process.cwd(), "dist");
const indexHtmlPath = path.join(distPath, "index.html");
const isProduction = process.env.NODE_ENV === "production" && fs.existsSync(indexHtmlPath);

if (isProduction) {
  app.use("/*", serveStatic({ root: "./dist" }));
  
  app.get("*", (c) => {
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    return c.html(indexHtml);
  });
}

const port = isProduction ? 5000 : 3001;
console.log(`Backend API server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
