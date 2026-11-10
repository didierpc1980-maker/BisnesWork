import type { Invoice } from "../models/invoice";

/** Datos mínimos de una línea necesarios para calcular sus importes. */
export interface InvoiceItemInput {
  quantity: number;
  unitPrice: number;
  /** Porcentaje de descuento de la línea, de 0 a 100. */
  discountRate?: number;
  /** Porcentaje de impuesto de la línea (por ejemplo, 21). */
  taxRate?: number;
}

export interface InvoiceItemTotals {
  /** Base imponible después del descuento. */
  lineSubtotal: number;
  /** Importe descontado en la línea. */
  discountAmount: number;
  /** Importe del impuesto de la línea. */
  lineTax: number;
  /** Total de la línea: lineSubtotal + lineTax. */
  lineTotal: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

/** Redondea un importe al número de decimales indicado (2 por defecto). */
export function roundMoney(value: number, decimalPlaces = 2): number {
  assertFinite("value", value);

  if (
    !Number.isInteger(decimalPlaces) ||
    decimalPlaces < 0 ||
    decimalPlaces > 20
  ) {
    throw new RangeError("decimalPlaces debe ser un entero entre 0 y 20");
  }

  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calcula los importes de una línea de factura.
 *
 * @throws {RangeError} si `quantity` no es mayor que 0, si algún importe es
 * negativo o si los porcentajes están fuera de rango.
 */
export function calculateInvoiceItem(
  input: InvoiceItemInput,
  decimalPlaces = 2,
): InvoiceItemTotals {
  assertFinite("quantity", input.quantity);
  assertFinite("unitPrice", input.unitPrice);

  if (input.quantity <= 0) {
    throw new RangeError("quantity debe ser mayor que 0");
  }
  if (input.unitPrice < 0) {
    throw new RangeError("unitPrice no puede ser negativo");
  }

  const discountRate = input.discountRate ?? 0;
  const taxRate = input.taxRate ?? 0;

  assertFinite("discountRate", discountRate);
  assertFinite("taxRate", taxRate);

  if (discountRate < 0 || discountRate > 100) {
    throw new RangeError("discountRate debe estar entre 0 y 100");
  }
  if (taxRate < 0) {
    throw new RangeError("taxRate no puede ser negativo");
  }

  const gross = roundMoney(input.quantity * input.unitPrice, decimalPlaces);
  const discountAmount = roundMoney(
    gross * (discountRate / 100),
    decimalPlaces,
  );
  const lineSubtotal = roundMoney(gross - discountAmount, decimalPlaces);
  const lineTax = roundMoney(
    lineSubtotal * (taxRate / 100),
    decimalPlaces,
  );

  return {
    lineSubtotal,
    discountAmount,
    lineTax,
    lineTotal: roundMoney(lineSubtotal + lineTax, decimalPlaces),
  };
}

/** Calcula los totales de una factura a partir de sus líneas. */
export function calculateInvoiceTotals(
  items: readonly InvoiceItemInput[],
  decimalPlaces = 2,
): InvoiceTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let total = 0;

  for (const item of items) {
    const totals = calculateInvoiceItem(item, decimalPlaces);

    subtotal += totals.lineSubtotal;
    discountTotal += totals.discountAmount;
    taxTotal += totals.lineTax;
    total += totals.lineTotal;
  }

  return {
    subtotal: roundMoney(subtotal, decimalPlaces),
    discountTotal: roundMoney(discountTotal, decimalPlaces),
    taxTotal: roundMoney(taxTotal, decimalPlaces),
    total: roundMoney(total, decimalPlaces),
  };
}

/**
 * Devuelve una copia de la factura con los importes de las líneas y los
 * totales recalculados.
 */
export function applyTotalsToInvoice(
  invoice: Invoice,
  decimalPlaces = 2,
): Invoice {
  const items = invoice.items.map((item) => {
    const totals = calculateInvoiceItem(item, decimalPlaces);

    return {
      ...item,
      lineSubtotal: totals.lineSubtotal,
      lineTax: totals.lineTax,
      lineTotal: totals.lineTotal,
    };
  });

  return {
    ...invoice,
    items,
    ...calculateInvoiceTotals(items, decimalPlaces),
  };
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} debe ser un número finito`);
  }
}
