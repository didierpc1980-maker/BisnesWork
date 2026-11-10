import type {
  Invoice,
  InvoiceCustomer,
  InvoiceItem,
  InvoiceStatus,
} from "./models/invoice";
import type { InvoiceItemInput } from "./domain/invoice-calculations";
import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
} from "./domain/invoice-calculations";
import {
  LANGUAGE_CHANGED_EVENT,
  formatDate,
  formatMoney,
  getLanguage,
  initI18n,
  setLanguage,
  statusLabel,
  t,
  translateApiError,
  validationFieldLabel,
  validationIssueMessage,
  type Language,
} from "./i18n";
import { downloadInvoicePdf } from "./pdf/invoice-pdf";
import { invoiceSchema } from "./schemas/invoice.schema";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface InvoiceSummary {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  customerName: string;
  total: number;
  issueDate: string;
  updatedAt: string;
}

interface IncomePeriod {
  total: number;
  count: number;
}

interface IncomeStatistics {
  week: IncomePeriod;
  month: IncomePeriod;
  year: IncomePeriod;
}

type AuthMode = "login" | "register";
type ToastKind = "success" | "error";

const authScreen = getElement<HTMLElement>("authScreen");
const authForm = getElement<HTMLFormElement>("authForm");
const authNameField = getElement<HTMLElement>("authNameField");
const authNameInput = getElement<HTMLInputElement>("authName");
const authEmailInput = getElement<HTMLInputElement>("authEmail");
const authPasswordInput = getElement<HTMLInputElement>("authPassword");
const authError = getElement<HTMLElement>("authError");
const authSubmit = getElement<HTMLButtonElement>("authSubmit");
const loginTab = getElement<HTMLButtonElement>("loginTab");
const registerTab = getElement<HTMLButtonElement>("registerTab");
const appShell = getElement<HTMLElement>("appShell");

const itemsBody = getElement<HTMLTableSectionElement>("itemsBody");
const currencyInput = getElement<HTMLInputElement>("currency");
const statusSelect = getElement<HTMLSelectElement>("status");
const invoiceNumberInput = getElement<HTMLInputElement>("invoiceNumber");
const footNumber = getElement<HTMLElement>("footNumber");
const issueDateInput = getElement<HTMLInputElement>("issueDate");
const dueDateInput = getElement<HTMLInputElement>("dueDate");
const customerNameInput = getElement<HTMLInputElement>("customerName");
const customerTaxIdInput = getElement<HTMLInputElement>("customerTaxId");
const customerEmailInput = getElement<HTMLInputElement>("customerEmail");
const customerAddressInput = getElement<HTMLInputElement>("customerAddress");
const notesInput = getElement<HTMLTextAreaElement>("notes");
const subtotalEl = getElement<HTMLElement>("subtotal");
const discountTotalEl = getElement<HTMLElement>("discountTotal");
const taxTotalEl = getElement<HTMLElement>("taxTotal");
const totalEl = getElement<HTMLElement>("total");
const validationStatus = getElement<HTMLElement>("validationStatus");
const addItemButton = getElement<HTMLButtonElement>("addItem");
const addItemBelowButton = getElement<HTMLButtonElement>("addItemBelow");
const printButton = getElement<HTMLButtonElement>("printBtn");
const downloadPdfButton = getElement<HTMLButtonElement>("downloadPdfBtn");
const saveButton = getElement<HTMLButtonElement>("saveBtn");
const newInvoiceButton = getElement<HTMLButtonElement>("newInvoiceBtn");
const invoicesButton = getElement<HTMLButtonElement>("invoicesBtn");
const statisticsButton = getElement<HTMLButtonElement>("statisticsBtn");
const logoutButton = getElement<HTMLButtonElement>("logoutBtn");
const settingsButton = getElement<HTMLButtonElement>("settingsBtn");
const invoicesModal = getElement<HTMLElement>("invoicesModal");
const invoicesList = getElement<HTMLUListElement>("invoicesList");
const invoicesEmpty = getElement<HTMLElement>("invoicesEmpty");
const closeInvoicesButton = getElement<HTMLButtonElement>("closeInvoicesBtn");
const statisticsModal = getElement<HTMLElement>("statisticsModal");
const closeStatisticsButton = getElement<HTMLButtonElement>("closeStatisticsBtn");
const statisticsLoading = getElement<HTMLElement>("statisticsLoading");
const statisticsGrid = getElement<HTMLElement>("statisticsGrid");
const statisticsWeekTotal = getElement<HTMLElement>("statisticsWeekTotal");
const statisticsWeekCount = getElement<HTMLElement>("statisticsWeekCount");
const statisticsMonthTotal = getElement<HTMLElement>("statisticsMonthTotal");
const statisticsMonthCount = getElement<HTMLElement>("statisticsMonthCount");
const statisticsYearTotal = getElement<HTMLElement>("statisticsYearTotal");
const statisticsYearCount = getElement<HTMLElement>("statisticsYearCount");
const settingsModal = getElement<HTMLElement>("settingsModal");
const closeSettingsButton = getElement<HTMLButtonElement>("closeSettingsBtn");
const toastElement = getElement<HTMLElement>("toast");

const languageInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="language"]'),
);
const languageButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-language]"),
);

interface DefaultLine extends InvoiceItemInput {
  description: string;
}

const ZERO_LINE_TOTALS = {
  lineSubtotal: 0,
  discountAmount: 0,
  lineTax: 0,
  lineTotal: 0,
} as const;

let currentUser: AuthUser | null = null;
let authMode: AuthMode = "login";
let authBusy = false;
let invoiceId: string | null = null;
let draftId = createId("invoice");
let invoiceCreatedAt = new Date().toISOString();
let invoicePaidAt: string | undefined;
let dirty = false;
let toastTimer: number | undefined;

class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`No se encontró el elemento #${id}`);
  }

  return element as T;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyInput(value: number): string {
  return formatMoney(value, currencyInput.value);
}

function toIsoDateTime(date: string): string {
  return date ? `${date}T00:00:00.000Z` : "";
}

function isPastDue(dueDate: string): boolean {
  return Boolean(dueDate) && dueDate < dateInputValue(new Date());
}

function deriveInvoiceStatus(
  requestedStatus: InvoiceStatus,
  dueDate: string,
): InvoiceStatus {
  if (requestedStatus === "paid" || requestedStatus === "cancelled") {
    return requestedStatus;
  }

  return isPastDue(dueDate) ? "overdue" : "issued";
}

function syncAutomaticStatus(): void {
  const current = statusSelect.value as InvoiceStatus;
  const status = deriveInvoiceStatus(current, dueDateInput.value);

  if (statusSelect.value !== status) {
    statusSelect.value = status;
  }

  statusSelect.dataset.status = status;
}

function dateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return translateApiError(error.message);
  }

  if (error instanceof Error) {
    return translateApiError(error.message);
  }

  return t("api.unexpected");
}

async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    const headers = new Headers(options.headers);
    headers.set("Accept-Language", getLanguage());

    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new ApiRequestError(0, t("api.connect"));
  }

  if (response.status === 401 && currentUser) {
    showAuthScreen();
    toast(t("session.expired"), "error");
    throw new ApiRequestError(401, t("session.expiredShort"));
  }

  if (!response.ok) {
    let message = t("api.operation");

    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Respuesta sin cuerpo JSON.
    }

    throw new ApiRequestError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function toast(message: string, kind: ToastKind = "success"): void {
  toastElement.textContent = message;
  toastElement.dataset.kind = kind;
  toastElement.hidden = false;

  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toastElement.hidden = true;
  }, 3200);
}

function updateAuthSubmitLabel(): void {
  const key = authBusy
    ? authMode === "login"
      ? "auth.busyLogin"
      : "auth.busyRegister"
    : authMode === "login"
      ? "auth.submitLogin"
      : "auth.submitRegister";

  authSubmit.textContent = t(key);
}

function setAuthMode(mode: AuthMode): void {
  authMode = mode;
  const isRegister = mode === "register";

  loginTab.setAttribute("aria-selected", String(!isRegister));
  registerTab.setAttribute("aria-selected", String(isRegister));
  authNameField.hidden = !isRegister;
  authNameInput.required = isRegister;
  authPasswordInput.autocomplete = isRegister
    ? "new-password"
    : "current-password";
  updateAuthSubmitLabel();
  authError.hidden = true;
}

function showAuthError(message: string): void {
  authError.textContent = message;
  authError.hidden = false;
}

function setAuthBusy(busy: boolean): void {
  authBusy = busy;
  authSubmit.disabled = busy;
  updateAuthSubmitLabel();
}

function showAuthScreen(): void {
  currentUser = null;
  appShell.hidden = true;
  authScreen.hidden = false;
  authPasswordInput.value = "";
  authError.hidden = true;
  setAuthBusy(false);
  setAuthMode("login");
  closeInvoicesModal();
  closeSettings();
}

function showApp(user: AuthUser): void {
  currentUser = user;
  authScreen.hidden = true;
  appShell.hidden = false;
  void startNewInvoice();
}

async function bootstrap(): Promise<void> {
  try {
    const data = await api<{ user: AuthUser }>("/api/auth/me");
    showApp(data.user);
  } catch {
    showAuthScreen();
  }
}

async function handleAuthSubmit(): Promise<void> {
  authError.hidden = true;

  const name = authNameInput.value.trim();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (authMode === "register" && !name) {
    showAuthError(t("auth.errorName"));
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError(t("auth.errorEmail"));
    return;
  }

  if (password.length < 8) {
    showAuthError(t("auth.errorPassword"));
    return;
  }

  setAuthBusy(true);

  try {
    const data = await api<{ user: AuthUser }>(
      `/api/auth/${authMode === "login" ? "login" : "register"}`,
      {
        method: "POST",
        body: JSON.stringify(
          authMode === "login" ? { email, password } : { name, email, password },
        ),
      },
    );

    authPasswordInput.value = "";
    authNameInput.value = "";
    showApp(data.user);
    toast(t("auth.welcome", { name: data.user.name }));
  } catch (error) {
    showAuthError(errorMessage(error));
  } finally {
    setAuthBusy(false);
  }
}

function readNumber(row: HTMLTableRowElement, field: string): number {
  const input = row.querySelector<HTMLInputElement>(
    `[data-field="${field}"]`,
  );

  return toNumber(input?.value ?? "");
}

function readLineInput(row: HTMLTableRowElement): InvoiceItemInput {
  return {
    quantity: readNumber(row, "quantity"),
    unitPrice: readNumber(row, "unitPrice"),
    discountRate: readNumber(row, "discountRate"),
    taxRate: readNumber(row, "taxRate"),
  };
}

function toCalculationInput(input: InvoiceItemInput): InvoiceItemInput {
  return {
    quantity: Math.max(0, input.quantity),
    unitPrice: Math.max(0, input.unitPrice),
    discountRate: Math.min(100, Math.max(0, input.discountRate ?? 0)),
    taxRate: Math.max(0, input.taxRate ?? 0),
  };
}

function setFieldValue(
  row: HTMLTableRowElement,
  field: string,
  value: string | number,
): void {
  const input = row.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `[data-field="${field}"]`,
  );

  if (input) {
    input.value = String(value);
  }
}

function createRow(item: Partial<DefaultLine> = {}): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.dataset.itemId = createId("item");

  row.innerHTML = `
    <td>
      <textarea data-field="description" rows="1" aria-label="${t("row.descriptionAria")}" autocomplete="off"></textarea>
    </td>
    <td class="num">
      <input type="number" data-field="quantity" min="0" step="0.01" inputmode="decimal" aria-label="${t("row.quantityAria")}" />
    </td>
    <td class="num">
      <input type="number" data-field="unitPrice" min="0" step="0.01" inputmode="decimal" aria-label="${t("row.unitPriceAria")}" />
    </td>
    <td class="num">
      <input type="number" data-field="discountRate" min="0" max="100" step="0.01" inputmode="decimal" aria-label="${t("row.discountAria")}" />
    </td>
    <td class="num">
      <input type="number" data-field="taxRate" min="0" step="0.01" inputmode="decimal" aria-label="${t("row.taxAria")}" />
    </td>
    <td class="num"><output class="line-total">—</output></td>
    <td class="no-print">
      <button type="button" class="remove" aria-label="${t("row.removeAria")}" title="${t("row.removeAria")}">×</button>
    </td>
  `;

  setFieldValue(row, "description", item.description ?? "");
  setFieldValue(row, "quantity", item.quantity ?? 1);
  setFieldValue(row, "unitPrice", item.unitPrice ?? 0);
  setFieldValue(row, "discountRate", item.discountRate ?? 0);
  setFieldValue(row, "taxRate", item.taxRate ?? 0);

  return row;
}

function autoSizeDescription(row: HTMLTableRowElement): void {
  const field = row.querySelector<HTMLTextAreaElement>(
    '[data-field="description"]',
  );

  if (!field) return;

  field.style.height = "auto";
  field.style.height = `${field.scrollHeight + 2}px`;
}

function buildInvoice(): Invoice {
  const rows = Array.from(
    itemsBody.querySelectorAll<HTMLTableRowElement>("tr"),
  );
  const calculationInputs: InvoiceItemInput[] = [];

  const items: InvoiceItem[] = rows.map((row) => {
    const input = readLineInput(row);
    const calculationInput = toCalculationInput(input);

    const totals =
      calculationInput.quantity > 0
        ? calculateInvoiceItem(calculationInput)
        : ZERO_LINE_TOTALS;

    if (calculationInput.quantity > 0) {
      calculationInputs.push(calculationInput);
    }

    const description =
      row.querySelector<HTMLTextAreaElement>('[data-field="description"]')
        ?.value.trim() ?? "";

    return {
      id: row.dataset.itemId ?? createId("item"),
      description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discountRate: input.discountRate,
      taxRate: input.taxRate,
      lineSubtotal: totals.lineSubtotal,
      lineTax: totals.lineTax,
      lineTotal: totals.lineTotal,
    };
  });

  const totals = calculateInvoiceTotals(calculationInputs);

  const customer: InvoiceCustomer = {
    id: "customer-preview",
    name: customerNameInput.value.trim(),
  };

  const taxId = customerTaxIdInput.value.trim();
  if (taxId) customer.taxId = taxId;

  const email = customerEmailInput.value.trim();
  if (email) customer.email = email;

  const address = customerAddressInput.value.trim();
  if (address) customer.address = address;

  const status = deriveInvoiceStatus(
    statusSelect.value as InvoiceStatus,
    dueDateInput.value,
  );

  return {
    id: invoiceId ?? draftId,
    number: invoiceNumberInput.value.trim(),
    status,
    currency: currencyInput.value.trim().toUpperCase(),
    customer,
    issueDate: toIsoDateTime(issueDateInput.value),
    dueDate: toIsoDateTime(dueDateInput.value),
    items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
    notes: notesInput.value.trim() || undefined,
    paidAt:
      status === "paid"
        ? (invoicePaidAt ?? new Date().toISOString())
        : undefined,
    createdAt: invoiceCreatedAt,
    updatedAt: new Date().toISOString(),
  };
}

function validate(invoice: Invoice): boolean {
  const result = invoiceSchema.safeParse(invoice);

  if (result.success) {
    validationStatus.dataset.state = "valid";
    validationStatus.textContent = t("validation.valid");
    validationStatus.title = "";
    return true;
  }

  const issues = result.error.issues;
  const firstIssue = issues[0];
  const path = firstIssue?.path.join(".") ?? "";

  validationStatus.dataset.state = "invalid";
  validationStatus.textContent = path
    ? t("validation.review", { field: validationFieldLabel(path) })
    : t("validation.reviewInvoice");
  validationStatus.title = issues
    .map((issue) => {
      const issuePath = issue.path.join(".") || "invoice";
      return `${validationFieldLabel(issuePath)}: ${validationIssueMessage(
        issuePath,
        issue.message,
      )}`;
    })
    .join("\n");

  return false;
}

function recalc(): void {
  syncAutomaticStatus();
  const invoice = buildInvoice();
  const rows = Array.from(
    itemsBody.querySelectorAll<HTMLTableRowElement>("tr"),
  );

  invoice.items.forEach((item, index) => {
    const output = rows[index]?.querySelector<HTMLOutputElement>(
      ".line-total",
    );

    if (output) {
      output.textContent = formatMoneyInput(item.lineTotal);
    }
  });

  subtotalEl.textContent = formatMoneyInput(invoice.subtotal);
  discountTotalEl.textContent = formatMoneyInput(invoice.discountTotal ?? 0);
  taxTotalEl.textContent = formatMoneyInput(invoice.taxTotal);
  totalEl.textContent = formatMoneyInput(invoice.total);

  validate(invoice);
}

function resetDates(): void {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  issueDateInput.value = dateInputValue(today);
  dueDateInput.value = dateInputValue(dueDate);
}

function populateInvoice(invoice: Invoice): void {
  invoiceId = invoice.id;
  invoiceCreatedAt = invoice.createdAt;
  invoicePaidAt = invoice.paidAt;

  invoiceNumberInput.value = invoice.number;
  statusSelect.value = invoice.status;
  statusSelect.dataset.status = invoice.status;
  currencyInput.value = invoice.currency;
  customerNameInput.value = invoice.customer.name;
  customerTaxIdInput.value = invoice.customer.taxId ?? "";
  customerEmailInput.value = invoice.customer.email ?? "";
  customerAddressInput.value = invoice.customer.address ?? "";
  issueDateInput.value = invoice.issueDate.slice(0, 10);
  dueDateInput.value = invoice.dueDate.slice(0, 10);
  notesInput.value = invoice.notes ?? "";
  footNumber.textContent = invoice.number || "—";

  itemsBody.replaceChildren();

  for (const item of invoice.items) {
    const row = createRow({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountRate: item.discountRate ?? 0,
      taxRate: item.taxRate ?? 0,
    });

    row.dataset.itemId = item.id;
    itemsBody.append(row);
    autoSizeDescription(row);
  }

  dirty = false;
  recalc();
}

async function startNewInvoice(): Promise<void> {
  invoiceId = null;
  draftId = createId("invoice");
  invoiceCreatedAt = new Date().toISOString();
  invoicePaidAt = undefined;

  invoiceNumberInput.value = "";
  invoiceNumberInput.placeholder = t("invoices.loadingNumber");
  statusSelect.value = "issued";
  statusSelect.dataset.status = "issued";
  currencyInput.value = "USD";
  customerNameInput.value = "";
  customerTaxIdInput.value = "";
  customerEmailInput.value = "";
  customerAddressInput.value = "";
  notesInput.value = t("notes.default");
  footNumber.textContent = "—";

  itemsBody.replaceChildren();
  const row = createRow();
  itemsBody.append(row);
  autoSizeDescription(row);
  resetDates();
  dirty = false;
  closeInvoicesModal();
  recalc();

  try {
    const data = await api<{ number: string }>("/api/invoices/next-number");

    if (!invoiceId && invoiceNumberInput.value.trim() === "") {
      invoiceNumberInput.value = data.number;
      footNumber.textContent = data.number;
      recalc();
    }
  } catch {
    // Si falla la petición, el número se puede escribir a mano.
  } finally {
    invoiceNumberInput.placeholder = "FAC-2026-0001";
  }
}

function invoicePayload(invoice: Invoice): object {
  return {
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    customer: {
      name: invoice.customer.name,
      ...(invoice.customer.taxId ? { taxId: invoice.customer.taxId } : {}),
      ...(invoice.customer.email ? { email: invoice.customer.email } : {}),
      ...(invoice.customer.address
        ? { address: invoice.customer.address }
        : {}),
    },
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountRate: item.discountRate ?? 0,
      taxRate: item.taxRate ?? 0,
    })),
    ...(invoice.notes ? { notes: invoice.notes } : {}),
  };
}

async function saveInvoice(): Promise<void> {
  const invoice = buildInvoice();

  if (!validate(invoice)) {
    validationStatus.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280, easing: "ease-in-out" },
    );
    toast(t("validation.saveError"), "error");
    return;
  }

  const editingId = invoiceId;
  saveButton.disabled = true;
  saveButton.textContent = t("invoices.saving");

  try {
    const data = editingId
      ? await api<{ invoice: Invoice }>(`/api/invoices/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(invoicePayload(invoice)),
        })
      : await api<{ invoice: Invoice }>("/api/invoices", {
          method: "POST",
          body: JSON.stringify(invoicePayload(invoice)),
        });

    populateInvoice(data.invoice);
    toast(t("invoices.saved", { number: data.invoice.number }));
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t("topbar.save");
  }
}

async function openInvoices(): Promise<void> {
  invoicesModal.hidden = false;
  invoicesList.replaceChildren();
  invoicesEmpty.hidden = false;
  invoicesEmpty.textContent = t("invoices.loading");

  try {
    const data = await api<{ invoices: InvoiceSummary[] }>("/api/invoices");
    renderInvoices(data.invoices);
  } catch (error) {
    invoicesEmpty.textContent = errorMessage(error);
  }
}

function renderInvoices(invoices: InvoiceSummary[]): void {
  invoicesList.replaceChildren();
  invoicesEmpty.hidden = invoices.length > 0;
  invoicesEmpty.textContent = t("invoices.empty");

  for (const summary of invoices) {
    const item = document.createElement("li");
    item.className = "invoice-row";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "invoice-open";

    const number = document.createElement("strong");
    number.textContent = summary.number;

    const meta = document.createElement("span");
    meta.textContent = `${summary.customerName || t("invoices.noCustomer")} · ${formatDate(summary.issueDate)}`;

    openButton.append(number, meta);
    openButton.addEventListener("click", () => {
      void loadInvoice(summary.id);
    });

    const badge = document.createElement("span");
    badge.className = "invoice-badge";
    badge.textContent = statusLabel(summary.status);

    const amount = document.createElement("span");
    amount.className = "invoice-amount";
    amount.textContent = formatMoney(summary.total, summary.currency);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "invoice-delete";
    deleteButton.textContent = t("invoices.delete");
    deleteButton.addEventListener("click", () => {
      void deleteInvoice(summary);
    });

    item.append(openButton, badge, amount, deleteButton);
    invoicesList.append(item);
  }
}

async function loadInvoice(id: string): Promise<void> {
  try {
    const data = await api<{ invoice: Invoice }>(`/api/invoices/${id}`);
    populateInvoice(data.invoice);
    closeInvoicesModal();
    toast(t("invoices.loaded", { number: data.invoice.number }));
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function deleteInvoice(summary: InvoiceSummary): Promise<void> {
  const confirmed = window.confirm(
    t("invoices.confirmDelete", { number: summary.number }),
  );

  if (!confirmed) return;

  try {
    await api(`/api/invoices/${summary.id}`, { method: "DELETE" });

    if (invoiceId === summary.id) {
      await startNewInvoice();
    }

    await openInvoices();
    toast(t("invoices.deleted", { number: summary.number }));
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

function closeInvoicesModal(): void {
  invoicesModal.hidden = true;
}

function formatIncomeCount(count: number): string {
  return t(
    count === 1 ? "statistics.paidInvoice" : "statistics.paidInvoices",
    { count },
  );
}

function renderIncomePeriod(
  total: HTMLElement,
  count: HTMLElement,
  period: IncomePeriod,
): void {
  total.textContent = formatMoney(period.total, currencyInput.value);
  count.textContent = formatIncomeCount(period.count);
}

async function openStatistics(): Promise<void> {
  statisticsModal.hidden = false;
  statisticsLoading.hidden = false;
  statisticsLoading.textContent = t("statistics.loading");
  statisticsGrid.hidden = true;

  try {
    const data = await api<IncomeStatistics>("/api/invoices/statistics");
    renderIncomePeriod(statisticsWeekTotal, statisticsWeekCount, data.week);
    renderIncomePeriod(statisticsMonthTotal, statisticsMonthCount, data.month);
    renderIncomePeriod(statisticsYearTotal, statisticsYearCount, data.year);
    statisticsLoading.hidden = true;
    statisticsGrid.hidden = false;
  } catch (error) {
    statisticsLoading.textContent = errorMessage(error);
  }
}

function closeStatistics(): void {
  statisticsModal.hidden = true;
}

function syncLanguageControls(): void {
  const language = getLanguage();

  for (const input of languageInputs) {
    input.checked = input.value === language;
  }

  for (const button of languageButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.language === language),
    );
  }
}

function openSettings(): void {
  syncLanguageControls();
  settingsModal.hidden = false;
}

function closeSettings(): void {
  settingsModal.hidden = true;
}

function changeLanguage(language: Language): void {
  if (language === getLanguage()) {
    syncLanguageControls();
    return;
  }

  setLanguage(language);
}

function addItem(): void {
  const row = createRow();
  itemsBody.append(row);
  autoSizeDescription(row);
  dirty = true;
  recalc();
  row.querySelector<HTMLTextAreaElement>('[data-field="description"]')?.focus();
}

addItemButton.addEventListener("click", addItem);
addItemBelowButton.addEventListener("click", addItem);

printButton.addEventListener("click", () => {
  window.print();
});

downloadPdfButton.addEventListener("click", () => {
  const invoice = buildInvoice();

  if (!validate(invoice)) {
    validationStatus.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280, easing: "ease-in-out" },
    );
    return;
  }

  downloadInvoicePdf(invoice);
});

saveButton.addEventListener("click", () => {
  void saveInvoice();
});

newInvoiceButton.addEventListener("click", () => {
  if (dirty && !window.confirm(t("invoices.confirmNew"))) {
    return;
  }

  void startNewInvoice();
});

invoicesButton.addEventListener("click", () => {
  void openInvoices();
});

statisticsButton.addEventListener("click", () => {
  void openStatistics();
});

closeStatisticsButton.addEventListener("click", closeStatistics);

statisticsModal.addEventListener("click", (event) => {
  if (event.target === statisticsModal) {
    closeStatistics();
  }
});

closeInvoicesButton.addEventListener("click", closeInvoicesModal);

invoicesModal.addEventListener("click", (event) => {
  if (event.target === invoicesModal) {
    closeInvoicesModal();
  }
});

settingsButton.addEventListener("click", openSettings);

closeSettingsButton.addEventListener("click", closeSettings);

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettings();
  }
});

for (const input of languageInputs) {
  input.addEventListener("change", () => {
    if (input.checked) {
      changeLanguage(input.value as Language);
    }
  });
}

for (const button of languageButtons) {
  button.addEventListener("click", () => {
    changeLanguage(button.dataset.language as Language);
  });
}

logoutButton.addEventListener("click", () => {
  if (dirty && !window.confirm(t("invoices.confirmLogout"))) {
    return;
  }

  void (async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // La sesión local se cierra igualmente.
    }

    showAuthScreen();
    toast(t("session.closed"));
  })();
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void handleAuthSubmit();
});

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

itemsBody.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest<HTMLButtonElement>(".remove");

  if (!button) return;

  button.closest("tr")?.remove();

  if (!itemsBody.querySelector("tr")) {
    const row = createRow();
    itemsBody.append(row);
    autoSizeDescription(row);
  }

  dirty = true;
  recalc();
});

currencyInput.addEventListener("input", () => {
  const clean = currencyInput.value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);

  if (currencyInput.value !== clean) {
    currencyInput.value = clean;
  }
});

statusSelect.addEventListener("change", () => {
  statusSelect.dataset.status = statusSelect.value;
  dirty = true;
  recalc();
});

invoiceNumberInput.addEventListener("input", () => {
  footNumber.textContent = invoiceNumberInput.value.trim() || "—";
  dirty = true;
  recalc();
});

issueDateInput.addEventListener("change", () => {
  dirty = true;
  recalc();
});

dueDateInput.addEventListener("change", () => {
  dirty = true;
  recalc();
});

document.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof Element) || !target.closest(".invoice")) {
    return;
  }

  if (target.matches('[data-field="description"]')) {
    const row = target.closest<HTMLTableRowElement>("tr");

    if (row) {
      autoSizeDescription(row);
    }
  }

  dirty = true;
  recalc();
});

window.addEventListener("resize", () => {
  for (const row of itemsBody.querySelectorAll<HTMLTableRowElement>("tr")) {
    autoSizeDescription(row);
  }
});

window.addEventListener(LANGUAGE_CHANGED_EVENT, () => {
  syncLanguageControls();
  updateAuthSubmitLabel();

  if (appShell.hidden) return;

  recalc();

  if (!statisticsModal.hidden) {
    void openStatistics();
  }

  if (!invoicesModal.hidden) {
    void openInvoices();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!statisticsModal.hidden) {
      closeStatistics();
      return;
    }

    if (!settingsModal.hidden) {
      closeSettings();
      return;
    }

    if (!invoicesModal.hidden) {
      closeInvoicesModal();
      return;
    }
  }

  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "s" &&
    currentUser
  ) {
    event.preventDefault();
    void saveInvoice();
  }
});

initI18n();
setAuthMode("login");
syncLanguageControls();
void bootstrap();
