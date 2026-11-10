import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { db } from "./db";
import { ApiError } from "./errors";
import { parseWith } from "./validation";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

interface SessionRow {
  expires_at: string;
  id: string;
  name: string;
  email: string;
}

const SESSION_COOKIE = "sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(80, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("El correo no es válido.")
    .max(200, "El correo es demasiado largo."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(200, "La contraseña es demasiado larga."),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("El correo no es válido.")
    .max(200),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const input = parseWith(registerSchema, req.body);

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(input.email) as { id: string } | undefined;

  if (existing) {
    throw new ApiError(409, "Ya existe una cuenta con ese correo.");
  }

  const { hash, salt } = hashPassword(input.password);
  const user: AuthUser = {
    id: `user-${randomUUID()}`,
    name: input.name,
    email: input.email,
  };
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(user.id, user.name, user.email, hash, salt, now);

  startSession(res, user.id);
  res.status(201).json({ user });
});

authRouter.post("/login", (req, res) => {
  const input = parseWith(loginSchema, req.body);

  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(input.email) as UserRow | undefined;

  if (
    !row ||
    !verifyPassword(input.password, row.password_salt, row.password_hash)
  ) {
    throw new ApiError(401, "Correo o contraseña incorrectos.");
  }

  startSession(res, row.id);
  res.json({
    user: { id: row.id, name: row.name, email: row.email } satisfies AuthUser,
  });
});

authRouter.post("/logout", (req, res) => {
  destroySession(req);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ user: getAuthUser(res) });
});

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = getSessionUser(req);

  if (!user) {
    res.status(401).json({ error: "Inicia sesión para continuar." });
    return;
  }

  res.locals.user = user;
  next();
}

export function getAuthUser(res: Response): AuthUser {
  return res.locals.user as AuthUser;
}

function getSessionUser(req: Request): AuthUser | null {
  const token = readCookie(req, SESSION_COOKIE);

  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.expires_at, u.id, u.name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as SessionRow | undefined;

  if (!row) return null;

  if (Date.parse(row.expires_at) <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
      hashToken(token),
    );
    return null;
  }

  return { id: row.id, name: row.name, email: row.email };
}

function startSession(res: Response, userId: string): void {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(hashToken(token), userId, expiresAt.toISOString(), now.toISOString());

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

function destroySession(req: Request): void {
  const token = readCookie(req, SESSION_COOKIE);

  if (!token) return;

  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return { hash, salt };
}

function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): boolean {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;

  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) continue;

    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return null;
}
