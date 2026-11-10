import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  formatDate,
  formatMoney as formatMoneyValue,
  formatQuantity,
  statusLabel,
  t,
} from "../i18n";
import type { Invoice, InvoiceStatus } from "../models/invoice";

type RGB = [number, number, number];

const PAGE_MARGIN = 48;
const INK: RGB = [15, 23, 42];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const ACCENT: RGB = [79, 70, 229];
const WHITE: RGB = [255, 255, 255];

const STATUS_STYLES: Record<
  InvoiceStatus,
  { text: RGB; background: RGB }
> = {
  draft: {
    text: [71, 85, 105],
    background: [248, 250, 252],
  },
  issued: {
    text: [29, 78, 216],
    background: [239, 246, 255],
  },
  partially_paid: {
    text: [180, 83, 9],
    background: [255, 251, 235],
  },
  paid: {
    text: [4, 120, 87],
    background: [236, 253, 245],
  },
  overdue: {
    text: [185, 28, 28],
    background: [254, 242, 242],
  },
  cancelled: {
    text: [159, 18, 57],
    background: [255, 241, 242],
  },
};

export function downloadInvoicePdf(invoice: Invoice): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightEdge = pageWidth - PAGE_MARGIN;

  drawHeader(doc, invoice, pageWidth);
  const tableStartY = drawCustomerAndDates(doc, invoice, pageWidth);

  autoTable(doc, {
    startY: tableStartY,
    margin: {
      top: PAGE_MARGIN,
      right: PAGE_MARGIN,
      bottom: 64,
      left: PAGE_MARGIN,
    },
    head: [
      [
        { content: t("table.description"), styles: { halign: "left" } },
        { content: t("table.quantity"), styles: { halign: "right" } },
        { content: t("table.unitPrice"), styles: { halign: "right" } },
        { content: t("table.discount"), styles: { halign: "right" } },
        { content: t("table.tax"), styles: { halign: "right" } },
        { content: t("table.total"), styles: { halign: "right" } },
      ],
    ],
    body: invoice.items.map((item) => [
      item.description || "—",
      formatQuantity(item.quantity),
      formatMoney(item.unitPrice, invoice.currency),
      `${item.discountRate ?? 0} %`,
      `${item.taxRate ?? 0} %`,
      formatMoney(item.lineTotal, invoice.currency),
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.5,
      cellPadding: { top: 7, right: 6, bottom: 7, left: 6 },
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: INK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      lineColor: INK,
    },
    columnStyles: {
      0: { cellWidth: 207, halign: "left" },
      1: { cellWidth: 52, halign: "right" },
      2: { cellWidth: 72, halign: "right" },
      3: { cellWidth: 48, halign: "right" },
      4: { cellWidth: 44, halign: "right" },
      5: { cellWidth: 72, halign: "right" },
    },
    showHead: "everyPage",
  });

  const lastAutoTable = (
    doc as jsPDF & {
      lastAutoTable?: { finalY?: number } | false;
    }
  ).lastAutoTable;

  let y =
    lastAutoTable && lastAutoTable.finalY
      ? lastAutoTable.finalY + 24
      : tableStartY + 24;

  if (y > pageHeight - 190) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  y = drawTotals(doc, invoice, y, rightEdge);
  y = drawNotes(doc, invoice, y, pageWidth, pageHeight);
  drawSignature(doc, y, pageWidth, pageHeight);
  drawFooters(doc, pageWidth, pageHeight);

  doc.save(`${safeFilename(invoice.number)}.pdf`);
}

function drawHeader(
  doc: jsPDF,
  invoice: Invoice,
  pageWidth: number,
): void {
  const rightEdge = pageWidth - PAGE_MARGIN;

  doc.setFillColor(...ACCENT);
  doc.roundedRect(PAGE_MARGIN, PAGE_MARGIN, 42, 42, 11, 11, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text("IDP", PAGE_MARGIN + 21, PAGE_MARGIN + 27, { align: "center" });

  doc.setTextColor(...INK);
  doc.setFontSize(14);
  doc.text("INV-DDS-PRO", PAGE_MARGIN + 54, PAGE_MARGIN + 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(1.2);
  doc.text(t("pdf.invoice"), rightEdge, 62, { align: "right" });
  doc.setCharSpace(0);

  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(invoice.number || "—", rightEdge, 80, { align: "right" });

  const status = STATUS_STYLES[invoice.status];
  const label = statusLabel(invoice.status).toUpperCase();
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const labelWidth = doc.getTextWidth(label);
  const pillWidth = labelWidth + 16;
  const pillX = rightEdge - pillWidth;

  doc.setFillColor(...status.background);
  doc.roundedRect(pillX, 90, pillWidth, 15, 7.5, 7.5, "F");
  doc.setTextColor(...status.text);
  doc.text(label, pillX + pillWidth / 2, 100, { align: "center" });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.8);
  doc.line(PAGE_MARGIN, 116, rightEdge, 116);
}

function drawCustomerAndDates(
  doc: jsPDF,
  invoice: Invoice,
  pageWidth: number,
): number {
  const rightEdge = pageWidth - PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(t("pdf.billedTo"), PAGE_MARGIN, 148);
  doc.text(t("pdf.issueDate"), rightEdge, 148, { align: "right" });
  doc.text(t("pdf.dueDate"), rightEdge, 176, { align: "right" });

  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(invoice.customer.name || "—", PAGE_MARGIN, 168);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(formatDate(invoice.issueDate), rightEdge, 162, {
    align: "right",
  });
  doc.text(formatDate(invoice.dueDate), rightEdge, 190, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);

  let y = 184;

  for (const line of [
    invoice.customer.taxId,
    invoice.customer.email,
    invoice.customer.address,
  ]) {
    if (!line) continue;

    const lines = doc.splitTextToSize(line, 260);
    doc.text(lines, PAGE_MARGIN, y);
    y += lines.length * 12 + 2;
  }

  return Math.max(236, y + 20);
}

function drawTotals(
  doc: jsPDF,
  invoice: Invoice,
  startY: number,
  rightEdge: number,
): number {
  const labelX = rightEdge - 180;
  let y = startY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);

  const rows: Array<[string, string]> = [
    [t("totals.subtotal"), formatMoney(invoice.subtotal, invoice.currency)],
    [
      t("totals.discounts"),
      formatMoney(invoice.discountTotal ?? 0, invoice.currency),
    ],
    [t("totals.taxes"), formatMoney(invoice.taxTotal, invoice.currency)],
  ];

  for (const [label, value] of rows) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(label, labelX, y);
    doc.setTextColor(...INK);
    doc.text(value, rightEdge, y, { align: "right" });
    y += 14;
  }

  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.line(labelX, y - 3, rightEdge, y - 3);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(t("totals.total").toUpperCase(), labelX, y);
  doc.text(formatMoney(invoice.total, invoice.currency), rightEdge, y, {
    align: "right",
  });

  return y;
}

function drawNotes(
  doc: jsPDF,
  invoice: Invoice,
  startY: number,
  pageWidth: number,
  pageHeight: number,
): number {
  if (!invoice.notes) return startY;

  let y = startY + 34;

  if (y > pageHeight - 120) {
    doc.addPage();
    y = PAGE_MARGIN + 24;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(t("pdf.notes"), PAGE_MARGIN, y);

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);

  const lines = doc.splitTextToSize(invoice.notes, pageWidth - PAGE_MARGIN * 2);
  doc.text(lines, PAGE_MARGIN, y);

  return y + lines.length * 12;
}

function drawSignature(
  doc: jsPDF,
  startY: number,
  pageWidth: number,
  pageHeight: number,
): void {
  const rightEdge = pageWidth - PAGE_MARGIN;
  const signatureWidth = 160;
  const lineY = Math.max(startY + 52, pageHeight - 102);

  if (lineY > pageHeight - 72) {
    doc.addPage();
    drawSignature(doc, PAGE_MARGIN, pageWidth, pageHeight);
    return;
  }

  const lineX = rightEdge - signatureWidth;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.7);
  doc.line(lineX, lineY, rightEdge, lineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(t("signature.authorized"), lineX + signatureWidth / 2, lineY + 13, {
    align: "center",
  });
}

function drawFooters(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
): void {
  const pageCount = doc.getNumberOfPages();
  const rightEdge = pageWidth - PAGE_MARGIN;
  const y = pageHeight - 32;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y - 12, rightEdge, y - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(t("app.brandFooter"), PAGE_MARGIN, y);
    doc.text(t("pdf.page", { page, total: pageCount }), rightEdge, y, {
      align: "right",
    });
  }
}

function formatMoney(value: number, currency: string): string {
  return formatMoneyValue(value, currency, undefined, "code").replace(
    /\u00a0/g,
    " ",
  );
}

function safeFilename(value: string): string {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim() || t("pdf.filenameFallback")
  );
}
