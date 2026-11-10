import fs from "node:fs";
import path from "node:path";

import express from "express";
import type { NextFunction, Request, Response } from "express";

import { authRouter } from "./auth";
import { db } from "./db";
import { ApiError } from "./errors";
import { invoicesRouter } from "./invoices";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "127.0.0.1";

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: "sqlite" });
});

app.use("/api/auth", authRouter);
app.use("/api/invoices", invoicesRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

const distDir = path.resolve(process.cwd(), "dist");
const indexFile = path.join(distDir, "index.html");

if (fs.existsSync(indexFile)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(indexFile);
  });
}

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    if (
      error instanceof SyntaxError &&
      "body" in error &&
      error.message.includes("JSON")
    ) {
      res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
      return;
    }

    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  },
);

const server = app.listen(port, host, () => {
  console.log(`INV-DDS-PRO · API en http://${host}:${port}`);
  if (fs.existsSync(indexFile)) {
    console.log(`Sirviendo la app compilada desde ${distDir}`);
  }
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
