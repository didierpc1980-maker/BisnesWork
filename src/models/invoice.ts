/**
 * Modelo de dominio para facturas.
 *
 * Los importes monetarios se expresan en unidades de la moneda indicada
 * (por ejemplo, 19.99 para USD), no en centavos.
 */

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface InvoiceCustomer {
  id: string;
  name: string;
  /** Identificación fiscal del cliente (NIF, RUC, RFC, VAT, etc.). */
  taxId?: string;
  email?: string;
  address?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  /** Precio unitario sin impuestos. */
  unitPrice: number;
  /** Porcentaje de descuento de la línea, de 0 a 100. */
  discountRate?: number;
  /** Porcentaje de impuesto de la línea (por ejemplo, 21 para IVA del 21 %). */
  taxRate?: number;
  /** Base imponible de la línea después de aplicar el descuento. */
  lineSubtotal: number;
  /** Importe del impuesto de la línea. */
  lineTax: number;
  /** Total de la línea: lineSubtotal + lineTax. */
  lineTotal: number;
}

export interface Invoice {
  id: string;
  /** Número de factura visible para el cliente (por ejemplo, "FAC-2026-0001"). */
  number: string;
  status: InvoiceStatus;
  /** Código ISO 4217 de la moneda (por ejemplo, "USD", "EUR", "ARS"). */
  currency: string;
  customer: InvoiceCustomer;
  /** Fecha de emisión en formato ISO 8601. */
  issueDate: string;
  /** Fecha de vencimiento en formato ISO 8601. */
  dueDate: string;
  items: InvoiceItem[];
  /** Suma de las bases imponibles de todas las líneas. */
  subtotal: number;
  /** Suma de los impuestos de todas las líneas. */
  taxTotal: number;
  /** Suma de los descuentos aplicados a las líneas. */
  discountTotal?: number;
  /** Importe final a pagar: subtotal + taxTotal. */
  total: number;
  notes?: string;
  /** Fecha y hora del pago completo en formato ISO 8601. */
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}
