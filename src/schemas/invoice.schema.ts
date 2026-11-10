import { z } from "zod";

import type {
  Invoice,
  InvoiceCustomer,
  InvoiceItem,
  InvoiceStatus,
} from "../models/invoice";

const isoDateSchema = z.string().datetime({ offset: true });

const moneySchema = z.number().finite().nonnegative();

export const invoiceStatusSchema = z.enum([
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]) satisfies z.ZodType<InvoiceStatus>;

export const invoiceCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  taxId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
}) satisfies z.ZodType<InvoiceCustomer>;

export const invoiceItemSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    quantity: z.number().finite().positive(),
    unitPrice: moneySchema,
    discountRate: z.number().finite().min(0).max(100).optional(),
    taxRate: z.number().finite().nonnegative().optional(),
    lineSubtotal: moneySchema,
    lineTax: moneySchema,
    lineTotal: moneySchema,
  })
  .superRefine((item, ctx) => {
    const expectedTotal = roundMoney(item.lineSubtotal + item.lineTax);

    if (Math.abs(item.lineTotal - expectedTotal) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineTotal"],
        message: "lineTotal debe ser igual a lineSubtotal + lineTax",
      });
    }
  }) satisfies z.ZodType<InvoiceItem>;

export const invoiceSchema = z
  .object({
    id: z.string().min(1),
    number: z.string().min(1),
    status: invoiceStatusSchema,
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "currency debe ser un código ISO 4217 de 3 letras"),
    customer: invoiceCustomerSchema,
    issueDate: isoDateSchema,
    dueDate: isoDateSchema,
    items: z.array(invoiceItemSchema).min(1),
    subtotal: moneySchema,
    taxTotal: moneySchema,
    discountTotal: moneySchema.optional(),
    total: moneySchema,
    notes: z.string().optional(),
    paidAt: isoDateSchema.optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .superRefine((invoice, ctx) => {
    const issueDate = Date.parse(invoice.issueDate);
    const dueDate = Date.parse(invoice.dueDate);

    if (dueDate < issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "dueDate no puede ser anterior a issueDate",
      });
    }

    const expectedTotal = roundMoney(invoice.subtotal + invoice.taxTotal);

    if (Math.abs(invoice.total - expectedTotal) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total"],
        message: "total debe ser igual a subtotal + taxTotal",
      });
    }
  }) satisfies z.ZodType<Invoice>;

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceOutput = z.infer<typeof invoiceSchema>;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
