import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const dataDir = path.resolve(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const databasePath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dataDir, "inv-dds-pro.db");

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    status TEXT NOT NULL,
    currency TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_tax_id TEXT,
    customer_email TEXT,
    customer_address TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax_total REAL NOT NULL,
    discount_total REAL NOT NULL,
    total REAL NOT NULL,
    notes TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_rate REAL NOT NULL,
    tax_rate REAL NOT NULL,
    line_subtotal REAL NOT NULL,
    line_tax REAL NOT NULL,
    line_total REAL NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_number
    ON invoices(user_id, number);
  CREATE INDEX IF NOT EXISTS invoices_user_updated
    ON invoices(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS invoice_items_invoice
    ON invoice_items(invoice_id, position);
  CREATE INDEX IF NOT EXISTS sessions_user
    ON sessions(user_id);
`);

db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(
  new Date().toISOString(),
);
