import { randomUUID } from "node:crypto";

import { Router } from "express";
import { z } from "zod";

import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
} from "../src/domain/invoice-calculations";
import type {
  Invoice,
  InvoiceCustomer,
  InvoiceItem,
  InvoiceStatus,
} from "../src/models/invoice";
import {
  invoiceSchema,
  invoiceStatusSchema,
} from "../src/schemas/invoice.schema";
import { getAuthUser, requireAuth } from "./auth";
import { db } from "./db";
import { ApiError } from "./errors";
import { parseWith } from "./validation";

interface InvoiceRow {
  id: string;
  user_id: string;
  number: string;
  status: string;
  currency: string;
  customer_id: string;
  customer_name: string;
  customer_tax_id: string | null;
  customer_email: string | null;
  customer_address: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InvoiceItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  tax_rate: number;
  line_subtotal: number;
  line_tax: number;
  line_total: number;
}

interface InvoiceSummaryRow {
  id: string;
  number: string;
  status: string;
  currency: string;
  customer_name: string;
  total: number;
  issue_date: string;
  updated_at: string;
}

interface IncomeRow {
  total: number | null;
  count: number;
}

const isoDateTimeSchema = z
  .string()
  .min(1, "La fecha es obligatoria.")
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "La fecha no es válida.",
  );

const invoicePayloadSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "El número de factura es obligatorio.")
    .max(60, "El número de factura es demasiado largo."),
  status: invoiceStatusSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "La moneda debe ser un código ISO de 3 letras."),
  customer: z.object({
    id: z.string().trim().optional(),
    name: z
      .string()
      .trim()
      .min(1, "El nombre del cliente es obligatorio.")
      .max(200, "El nombre del cliente es demasiado largo."),
    taxId: z.string().trim().max(60).optional(),
    email: z
      .string()
      .trim()
      .email("El correo del cliente no es válido.")
      .max(200)
      .optional(),
    address: z.string().trim().max(300).optional(),
  }),
  issueDate: isoDateTimeSchema,
  dueDate: isoDateTimeSchema,
  items: z
    .array(
      z.object({
        id: z.string().trim().optional(),
        description: z
          .string()
          .trim()
          .min(1, "Todas las líneas necesitan una descripción.")
          .max(300, "La descripción es demasiado larga."),
        quantity: z
          .number()
          .finite()
          .positive("La cantidad debe ser mayor que 0."),
        unitPrice: z
          .number()
          .finite()
          .nonnegative("El precio no puede ser negativo."),
        discountRate: z.number().finite().min(0).max(100).optional(),
        taxRate: z.number().finite().nonnegative().optional(),
      }),
    )
    .min(1, "La factura necesita al menos una línea."),
  notes: z.string().max(2000, "Las notas son demasiado largas.").optional(),
});

type InvoicePayload = z.infer<typeof invoicePayloadSchema>;

interface PrepareOptions {
  id: string;
  customerId: string;
  createdAt: string;
  paidAt?: string;
}

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

invoicesRouter.get("/", (_req, res) => {
  const user = getAuthUser(res);
  refreshOverdueStatuses(user.id);
  const rows = db
    .prepare(
      `SELECT id, number, status, currency, customer_name, total, issue_date, updated_at
       FROM invoices
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(user.id) as InvoiceSummaryRow[];

  res.json({
    invoices: rows.map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status as InvoiceStatus,
      currency: row.currency,
      customerName: row.customer_name,
      total: row.total,
      issueDate: row.issue_date,
      updatedAt: row.updated_at,
    })),
  });
});

invoicesRouter.get("/next-number", (_req, res) => {
  const user = getAuthUser(res);
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const rows = db
    .prepare(
      "SELECT number FROM invoices WHERE user_id = ? AND number LIKE ?",
    )
    .all(user.id, `${prefix}%`) as Array<{ number: string }>;

  let highest = 0;

  for (const row of rows) {
    const suffix = row.number.slice(prefix.length);

    if (/^\d+$/.test(suffix)) {
      highest = Math.max(highest, Number.parseInt(suffix, 10));
    }
  }

  res.json({ number: `${prefix}${String(highest + 1).padStart(4, "0")}` });
});

invoicesRouter.get("/statistics", (_req, res) => {
  const user = getAuthUser(res);
  const periods = incomePeriodStarts();

  res.json({
    week: incomeForPeriod(user.id, periods.week),
    month: incomeForPeriod(user.id, periods.month),
    year: incomeForPeriod(user.id, periods.year),
  });
});

invoicesRouter.get("/:id", (req, res) => {
  const user = getAuthUser(res);
  refreshOverdueStatuses(user.id);
  const invoice = findInvoice(req.params.id, user.id);

  res.json({ invoice });
});

invoicesRouter.post("/", (req, res) => {
  const user = getAuthUser(res);
  const payload = parseWith(invoicePayloadSchema, req.body);
  const invoice = prepareInvoice(payload, {
    id: `invoice-${randomUUID()}`,
    customerId: `customer-${randomUUID()}`,
    createdAt: new Date().toISOString(),
  });

  try {
    db.transaction(() => {
      insertInvoiceRow(invoice, user.id);
      insertInvoiceItems(invoice);
    })();
  } catch (error) {
    throw mapWriteError(error);
  }

  res.status(201).json({ invoice });
});

invoicesRouter.put("/:id", (req, res) => {
  const user = getAuthUser(res);
  const id = req.params.id;
  const existing = db
    .prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?")
    .get(id, user.id) as InvoiceRow | undefined;

  if (!existing) {
    throw new ApiError(404, "Factura no encontrada.");
  }

  const payload = parseWith(invoicePayloadSchema, req.body);
  const invoice = prepareInvoice(payload, {
    id: existing.id,
    customerId: existing.customer_id,
    createdAt: existing.created_at,
    paidAt: existing.paid_at ?? undefined,
  });

  try {
    db.transaction(() => {
      const result = db
        .prepare(
          `UPDATE invoices SET
             number = ?, status = ?, currency = ?,
             customer_id = ?, customer_name = ?, customer_tax_id = ?,
             customer_email = ?, customer_address = ?,
             issue_date = ?, due_date = ?,
             subtotal = ?, tax_total = ?, discount_total = ?, total = ?,
             notes = ?, paid_at = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`,
        )
        .run(
          invoice.number,
          invoice.status,
          invoice.currency,
          invoice.customer.id,
          invoice.customer.name,
          invoice.customer.taxId ?? null,
          invoice.customer.email ?? null,
          invoice.customer.address ?? null,
          invoice.issueDate,
          invoice.dueDate,
          invoice.subtotal,
          invoice.taxTotal,
          invoice.discountTotal ?? 0,
          invoice.total,
          invoice.notes ?? null,
          invoice.paidAt ?? null,
          invoice.updatedAt,
          invoice.id,
          user.id,
        );

      if (result.changes === 0) {
        throw new ApiError(404, "Factura no encontrada.");
      }

      db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(
        invoice.id,
      );
      insertInvoiceItems(invoice);
    })();
  } catch (error) {
    throw mapWriteError(error);
  }

  res.json({ invoice });
});

invoicesRouter.delete("/:id", (req, res) => {
  const user = getAuthUser(res);
  const result = db
    .prepare("DELETE FROM invoices WHERE id = ? AND user_id = ?")
    .run(req.params.id, user.id);

  if (result.changes === 0) {
    throw new ApiError(404, "Factura no encontrada.");
  }

  res.status(204).end();
});

function findInvoice(id: string, userId: string): Invoice {
  const row = db
    .prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?")
    .get(id, userId) as InvoiceRow | undefined;

  if (!row) {
    throw new ApiError(404, "Factura no encontrada.");
  }

  const items = db
    .prepare(
      `SELECT id, description, quantity, unit_price, discount_rate,
              tax_rate, line_subtotal, line_tax, line_total
       FROM invoice_items
       WHERE invoice_id = ?
       ORDER BY position`,
    )
    .all(id) as InvoiceItemRow[];

  return toInvoice(row, items);
}

function prepareInvoice(
  payload: InvoicePayload,
  options: PrepareOptions,
): Invoice {
  const now = new Date().toISOString();

  const items: InvoiceItem[] = payload.items.map((item) => {
    const totals = calculateInvoiceItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountRate: item.discountRate ?? 0,
      taxRate: item.taxRate ?? 0,
    });

    return {
      id: item.id?.trim() || `item-${randomUUID()}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountRate: item.discountRate ?? 0,
      taxRate: item.taxRate ?? 0,
      lineSubtotal: totals.lineSubtotal,
      lineTax: totals.lineTax,
      lineTotal: totals.lineTotal,
    };
  });

  const totals = calculateInvoiceTotals(items);
  const customer: InvoiceCustomer = {
    id: options.customerId,
    name: payload.customer.name,
  };

  if (payload.customer.taxId) customer.taxId = payload.customer.taxId;
  if (payload.customer.email) customer.email = payload.customer.email;
  if (payload.customer.address) customer.address = payload.customer.address;

  const status = deriveInvoiceStatus(payload.status, payload.dueDate);
  const invoice: Invoice = {
    id: options.id,
    number: payload.number,
    status,
    currency: payload.currency,
    customer,
    issueDate: payload.issueDate,
    dueDate: payload.dueDate,
    items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    createdAt: options.createdAt,
    updatedAt: now,
    paidAt:
      status === "paid" ? (options.paidAt ?? now) : undefined,
  };

  if (payload.notes) invoice.notes = payload.notes;

  const result = invoiceSchema.safeParse(invoice);

  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "";

    throw new ApiError(
      400,
      issue
        ? `Datos de factura no válidos: ${path ? `${path}: ` : ""}${issue.message}`
        : "Datos de factura no válidos.",
    );
  }

  return result.data;
}

/**
 * Una factura nueva se emite al guardarse. Si no se ha pagado ni cancelado,
 * pasa automáticamente a vencida después de su fecha de vencimiento.
 */
function deriveInvoiceStatus(
  requestedStatus: InvoiceStatus,
  dueDate: string,
): InvoiceStatus {
  if (requestedStatus === "paid" || requestedStatus === "cancelled") {
    return requestedStatus;
  }

  return isPastDue(dueDate) ? "overdue" : "issued";
}

function refreshOverdueStatuses(userId: string): void {
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE invoices
     SET status = 'overdue', updated_at = ?
     WHERE user_id = ?
       AND due_date < ?
       AND status NOT IN ('paid', 'cancelled', 'overdue')`,
  ).run(now, userId, startOfTodayIso());
}

function isPastDue(isoDate: string): boolean {
  return isoDate.slice(0, 10) < startOfTodayIso().slice(0, 10);
}

function startOfTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}T00:00:00.000Z`;
}

function incomePeriodStarts(): { week: string; month: string; year: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = today.getDay() || 7;
  const week = new Date(today);
  week.setDate(today.getDate() - weekday + 1);

  return {
    week: localDateStartIso(week),
    month: localDateStartIso(new Date(today.getFullYear(), today.getMonth(), 1)),
    year: localDateStartIso(new Date(today.getFullYear(), 0, 1)),
  };
}

function incomeForPeriod(
  userId: string,
  start: string,
): { total: number; count: number } {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
       FROM invoices
       WHERE user_id = ? AND status = 'paid' AND paid_at >= ?`,
    )
    .get(userId, start) as IncomeRow;

  return { total: row.total ?? 0, count: row.count };
}

function localDateStartIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}T00:00:00.000Z`;
}

function insertInvoiceRow(invoice: Invoice, userId: string): void {
  db.prepare(
    `INSERT INTO invoices (
       id, user_id, number, status, currency,
       customer_id, customer_name, customer_tax_id,
       customer_email, customer_address,
       issue_date, due_date, subtotal, tax_total, discount_total, total,
       notes, paid_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    invoice.id,
    userId,
    invoice.number,
    invoice.status,
    invoice.currency,
    invoice.customer.id,
    invoice.customer.name,
    invoice.customer.taxId ?? null,
    invoice.customer.email ?? null,
    invoice.customer.address ?? null,
    invoice.issueDate,
    invoice.dueDate,
    invoice.subtotal,
    invoice.taxTotal,
    invoice.discountTotal ?? 0,
    invoice.total,
    invoice.notes ?? null,
    invoice.paidAt ?? null,
    invoice.createdAt,
    invoice.updatedAt,
  );
}

function insertInvoiceItems(invoice: Invoice): void {
  const statement = db.prepare(
    `INSERT INTO invoice_items (
       id, invoice_id, position, description, quantity, unit_price,
       discount_rate, tax_rate, line_subtotal, line_tax, line_total
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  invoice.items.forEach((item, position) => {
    statement.run(
      item.id,
      invoice.id,
      position,
      item.description,
      item.quantity,
      item.unitPrice,
      item.discountRate ?? 0,
      item.taxRate ?? 0,
      item.lineSubtotal,
      item.lineTax,
      item.lineTotal,
    );
  });
}

function toInvoice(row: InvoiceRow, items: InvoiceItemRow[]): Invoice {
  const customer: InvoiceCustomer = {
    id: row.customer_id,
    name: row.customer_name,
  };

  if (row.customer_tax_id) customer.taxId = row.customer_tax_id;
  if (row.customer_email) customer.email = row.customer_email;
  if (row.customer_address) customer.address = row.customer_address;

  const invoice: Invoice = {
    id: row.id,
    number: row.number,
    status: row.status as InvoiceStatus,
    currency: row.currency,
    customer,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    items: items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      discountRate: item.discount_rate,
      taxRate: item.tax_rate,
      lineSubtotal: item.line_subtotal,
      lineTax: item.line_tax,
      lineTotal: item.line_total,
    })),
    subtotal: row.subtotal,
    taxTotal: row.tax_total,
    discountTotal: row.discount_total,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.notes) invoice.notes = row.notes;
  if (row.paid_at) invoice.paidAt = row.paid_at;

  return invoice;
}

function mapWriteError(error: unknown): unknown {
  if (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed")
  ) {
    return new ApiError(409, "Ya existe una factura con ese número.");
  }

  return error;
}
