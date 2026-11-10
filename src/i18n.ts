import type { InvoiceStatus } from "./models/invoice";

export type Language = "es" | "en";

export type TranslationVars = Record<string, string | number>;

const STORAGE_KEY = "inv-dds-pro:language";

export const LANGUAGE_CHANGED_EVENT = "inv-dds-pro:language-changed";

const es = {
  "app.title": "INV-DDS-PRO · Factura",
  "app.description": "Editor y vista previa de facturas de INV-DDS-PRO.",
  "app.tagline": "Facturación",
  "app.brandFooter": "INV-DDS-PRO · Facturación",
  "app.issuerSubtitle": "Servicios profesionales · hola@inv-dds-pro.com",
  "app.noscript": "Activa JavaScript para editar y calcular la factura.",

  "common.close": "Cerrar",

  "auth.ariaLabel": "Acceso",
  "auth.loginTab": "Entrar",
  "auth.registerTab": "Crear cuenta",
  "auth.name": "Nombre",
  "auth.email": "Correo",
  "auth.password": "Contraseña",
  "auth.submitLogin": "Entrar",
  "auth.submitRegister": "Crear cuenta",
  "auth.busyLogin": "Entrando…",
  "auth.busyRegister": "Creando cuenta…",
  "auth.hint": "Cada cuenta solo puede ver y editar sus propias facturas.",
  "auth.errorName": "Escribe tu nombre.",
  "auth.errorEmail": "Escribe un correo válido.",
  "auth.errorPassword": "La contraseña debe tener al menos 8 caracteres.",
  "auth.welcome": "Bienvenido, {name}.",

  "session.expired": "Tu sesión ha caducado. Vuelve a entrar.",
  "session.expiredShort": "Sesión caducada.",
  "session.closed": "Sesión cerrada.",

  "api.connect": "No se pudo conectar con el servidor.",
  "api.operation": "No se pudo completar la operación.",
  "api.unexpected": "Ha ocurrido un error inesperado.",

  "status.draft": "Borrador",
  "status.issued": "Emitida",
  "status.partially_paid": "Pago parcial",
  "status.paid": "Pagada",
  "status.overdue": "Vencida",
  "status.cancelled": "Anulada",

  "topbar.new": "Nueva",
  "topbar.invoices": "Mis facturas",
  "topbar.statistics": "Estadísticas",
  "topbar.save": "Guardar",
  "topbar.addItem": "+ Añadir línea",
  "topbar.print": "Imprimir",
  "topbar.downloadPdf": "Descargar PDF",
  "topbar.logout": "Salir",
  "topbar.settings": "Ajustes",

  "invoice.ariaLabel": "Factura",
  "invoice.title": "Factura",
  "invoice.number": "N.º",
  "invoice.numberAria": "Número de factura",
  "invoice.status": "Estado",
  "invoice.statusAria": "Estado de la factura",
  "invoice.statusHint":
    "Emitida y vencida se calculan automáticamente. Marca pagada al recibir el pago o anulada si no se cobrará.",
  "invoice.currency": "Moneda",
  "invoice.currencyAria": "Moneda ISO 4217",
  "invoice.billedTo": "Facturado a",
  "invoice.dates": "Fechas",
  "invoice.issueDate": "Emisión",
  "invoice.dueDate": "Vencimiento",
  "invoice.customerName": "Nombre del cliente",
  "invoice.customerTaxId": "Identificación fiscal",
  "invoice.customerEmail": "Correo del cliente",
  "invoice.customerAddress": "Dirección del cliente",

  "table.description": "Descripción",
  "table.quantity": "Cantidad",
  "table.unitPrice": "Precio unit.",
  "table.discount": "Desc. %",
  "table.tax": "Imp. %",
  "table.total": "Total",
  "table.actions": "Acciones",

  "totals.subtotal": "Subtotal",
  "totals.discounts": "Descuentos",
  "totals.taxes": "Impuestos",
  "totals.total": "Total",

  "notes.label": "Notas",
  "notes.default":
    "Gracias por su preferencia. Métodos de pago aceptados: cuenta bancaria, efectivo, cheque y tarjeta de crédito.",
  "signature.authorized": "Firma autorizada",

  "row.descriptionAria": "Descripción",
  "row.quantityAria": "Cantidad",
  "row.unitPriceAria": "Precio unitario",
  "row.discountAria": "Descuento en porcentaje",
  "row.taxAria": "Impuesto en porcentaje",
  "row.removeAria": "Eliminar línea",

  "validation.checking": "Comprobando…",
  "validation.valid": "Factura válida",
  "validation.review": "Revisa {field}",
  "validation.reviewInvoice": "Revisa la factura",
  "validation.invoiceField": "factura",
  "validation.saveError": "Revisa la factura antes de guardar.",
  "validation.numberRequired": "El número de factura es obligatorio.",
  "validation.customerNameRequired": "El nombre del cliente es obligatorio.",
  "validation.currencyFormat":
    "La moneda debe ser un código ISO de 3 letras.",
  "validation.itemsRequired": "La factura necesita al menos una línea.",
  "validation.descriptionRequired":
    "Todas las líneas necesitan una descripción.",
  "validation.dateInvalid": "La fecha no es válida.",
  "validation.dueDateOrder":
    "La fecha de vencimiento no puede ser anterior a la de emisión.",
  "validation.amountInvalid": "El importe no es válido.",
  "validation.totalMismatch": "El total no coincide con los importes.",
  "validation.lineTotalMismatch":
    "El total de la línea no coincide con su base y su impuesto.",

  "field.number": "el número de factura",
  "field.customerName": "el nombre del cliente",
  "field.currency": "la moneda",
  "field.issueDate": "la fecha de emisión",
  "field.dueDate": "la fecha de vencimiento",
  "field.items": "las líneas",
  "field.itemDescription": "la descripción de una línea",
  "field.notes": "las notas",
  "field.total": "los totales",
  "field.generic": "la factura",

  "invoices.title": "Mis facturas",
  "invoices.loading": "Cargando facturas…",
  "invoices.empty": "No tienes facturas guardadas todavía.",
  "invoices.noCustomer": "Sin cliente",
  "invoices.delete": "Eliminar",
  "invoices.loaded": "Factura {number} cargada.",
  "invoices.saved": "Factura {number} guardada.",
  "invoices.saving": "Guardando…",
  "invoices.deleted": "Factura {number} eliminada.",
  "invoices.confirmDelete":
    "¿Eliminar la factura {number}? Esta acción no se puede deshacer.",
  "invoices.confirmNew":
    "¿Crear una factura nueva? Se perderán los cambios sin guardar.",
  "invoices.confirmLogout":
    "¿Cerrar sesión? Se perderán los cambios sin guardar.",
  "invoices.loadingNumber": "Cargando…",

  "statistics.title": "Control de ingresos",
  "statistics.loading": "Calculando ingresos…",
  "statistics.week": "Esta semana",
  "statistics.month": "Este mes",
  "statistics.year": "Este año",
  "statistics.paidInvoices": "{count} facturas pagadas",
  "statistics.paidInvoice": "{count} factura pagada",
  "statistics.note": "Solo se incluyen facturas marcadas como pagadas.",

  "settings.title": "Ajustes",
  "settings.language": "Idioma",
  "settings.languageHint":
    "Elige el idioma de la interfaz y de los PDF. Las notas que ya hayas escrito no se traducen.",
  "settings.spanish": "Español",
  "settings.english": "Inglés",

  "pdf.invoice": "FACTURA",
  "pdf.billedTo": "FACTURADO A",
  "pdf.issueDate": "EMISIÓN",
  "pdf.dueDate": "VENCIMIENTO",
  "pdf.notes": "NOTAS",
  "pdf.page": "Página {page} de {total}",
  "pdf.filenameFallback": "factura",

  "apiError.nameRequired": "El nombre es obligatorio.",
  "apiError.nameTooLong": "El nombre es demasiado largo.",
  "apiError.emailInvalid": "El correo no es válido.",
  "apiError.emailTooLong": "El correo es demasiado largo.",
  "apiError.passwordMin":
    "La contraseña debe tener al menos 8 caracteres.",
  "apiError.passwordTooLong": "La contraseña es demasiado larga.",
  "apiError.passwordRequired": "La contraseña es obligatoria.",
  "apiError.emailTaken": "Ya existe una cuenta con ese correo.",
  "apiError.invalidCredentials": "Correo o contraseña incorrectos.",
  "apiError.authRequired": "Inicia sesión para continuar.",
  "apiError.dateRequired": "La fecha es obligatoria.",
  "apiError.dateInvalid": "La fecha no es válida.",
  "apiError.numberRequired": "El número de factura es obligatorio.",
  "apiError.numberTooLong": "El número de factura es demasiado largo.",
  "apiError.currencyFormat":
    "La moneda debe ser un código ISO de 3 letras.",
  "apiError.customerNameRequired": "El nombre del cliente es obligatorio.",
  "apiError.customerNameTooLong": "El nombre del cliente es demasiado largo.",
  "apiError.customerEmailInvalid": "El correo del cliente no es válido.",
  "apiError.descriptionRequired":
    "Todas las líneas necesitan una descripción.",
  "apiError.descriptionTooLong": "La descripción es demasiado larga.",
  "apiError.quantityPositive": "La cantidad debe ser mayor que 0.",
  "apiError.priceNegative": "El precio no puede ser negativo.",
  "apiError.itemsRequired": "La factura necesita al menos una línea.",
  "apiError.notesTooLong": "Las notas son demasiado largas.",
  "apiError.invalidData": "Datos no válidos.",
  "apiError.invoiceNotFound": "Factura no encontrada.",
  "apiError.invoiceInvalid": "Datos de factura no válidos.",
  "apiError.duplicateNumber":
    "Ya existe una factura con ese número.",
  "apiError.routeNotFound": "Ruta no encontrada.",
  "apiError.invalidJson":
    "El cuerpo de la petición no es JSON válido.",
  "apiError.internal": "Error interno del servidor.",
} as const;

type Dictionary = Record<keyof typeof es, string>;

const en: Dictionary = {
  "app.title": "INV-DDS-PRO · Invoice",
  "app.description": "Invoice editor and preview for INV-DDS-PRO.",
  "app.tagline": "Invoicing",
  "app.brandFooter": "INV-DDS-PRO · Invoicing",
  "app.issuerSubtitle": "Professional services · hola@inv-dds-pro.com",
  "app.noscript": "Enable JavaScript to edit and calculate the invoice.",

  "common.close": "Close",

  "auth.ariaLabel": "Sign in",
  "auth.loginTab": "Sign in",
  "auth.registerTab": "Create account",
  "auth.name": "Name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.submitLogin": "Sign in",
  "auth.submitRegister": "Create account",
  "auth.busyLogin": "Signing in…",
  "auth.busyRegister": "Creating account…",
  "auth.hint": "Each account can only view and edit its own invoices.",
  "auth.errorName": "Enter your name.",
  "auth.errorEmail": "Enter a valid email.",
  "auth.errorPassword": "Password must be at least 8 characters.",
  "auth.welcome": "Welcome, {name}.",

  "session.expired": "Your session has expired. Please sign in again.",
  "session.expiredShort": "Session expired.",
  "session.closed": "Signed out.",

  "api.connect": "Could not connect to the server.",
  "api.operation": "The operation could not be completed.",
  "api.unexpected": "An unexpected error occurred.",

  "status.draft": "Draft",
  "status.issued": "Issued",
  "status.partially_paid": "Partially paid",
  "status.paid": "Paid",
  "status.overdue": "Overdue",
  "status.cancelled": "Cancelled",

  "topbar.new": "New",
  "topbar.invoices": "My invoices",
  "topbar.statistics": "Statistics",
  "topbar.save": "Save",
  "topbar.addItem": "+ Add line",
  "topbar.print": "Print",
  "topbar.downloadPdf": "Download PDF",
  "topbar.logout": "Sign out",
  "topbar.settings": "Settings",

  "invoice.ariaLabel": "Invoice",
  "invoice.title": "Invoice",
  "invoice.number": "No.",
  "invoice.numberAria": "Invoice number",
  "invoice.status": "Status",
  "invoice.statusAria": "Invoice status",
  "invoice.statusHint":
    "Issued and overdue are calculated automatically. Mark it paid when payment is received or cancelled if it will not be collected.",
  "invoice.currency": "Currency",
  "invoice.currencyAria": "ISO 4217 currency",
  "invoice.billedTo": "Billed to",
  "invoice.dates": "Dates",
  "invoice.issueDate": "Issue date",
  "invoice.dueDate": "Due date",
  "invoice.customerName": "Customer name",
  "invoice.customerTaxId": "Tax ID",
  "invoice.customerEmail": "Customer email",
  "invoice.customerAddress": "Customer address",

  "table.description": "Description",
  "table.quantity": "Quantity",
  "table.unitPrice": "Unit price",
  "table.discount": "Disc. %",
  "table.tax": "Tax %",
  "table.total": "Total",
  "table.actions": "Actions",

  "totals.subtotal": "Subtotal",
  "totals.discounts": "Discounts",
  "totals.taxes": "Taxes",
  "totals.total": "Total",

  "notes.label": "Notes",
  "notes.default":
    "Thank you for your business. Accepted payment methods: bank account, cash, check and credit card.",
  "signature.authorized": "Authorized signature",

  "row.descriptionAria": "Description",
  "row.quantityAria": "Quantity",
  "row.unitPriceAria": "Unit price",
  "row.discountAria": "Discount percentage",
  "row.taxAria": "Tax percentage",
  "row.removeAria": "Remove line",

  "validation.checking": "Checking…",
  "validation.valid": "Invoice is valid",
  "validation.review": "Check {field}",
  "validation.reviewInvoice": "Check the invoice",
  "validation.invoiceField": "invoice",
  "validation.saveError": "Check the invoice before saving.",
  "validation.numberRequired": "The invoice number is required.",
  "validation.customerNameRequired": "The customer name is required.",
  "validation.currencyFormat":
    "The currency must be a 3-letter ISO code.",
  "validation.itemsRequired": "The invoice needs at least one line item.",
  "validation.descriptionRequired":
    "Every line item needs a description.",
  "validation.dateInvalid": "The date is not valid.",
  "validation.dueDateOrder":
    "The due date cannot be earlier than the issue date.",
  "validation.amountInvalid": "The amount is not valid.",
  "validation.totalMismatch": "The total does not match the amounts.",
  "validation.lineTotalMismatch":
    "The line total does not match its subtotal and tax.",

  "field.number": "the invoice number",
  "field.customerName": "the customer name",
  "field.currency": "the currency",
  "field.issueDate": "the issue date",
  "field.dueDate": "the due date",
  "field.items": "the line items",
  "field.itemDescription": "a line item description",
  "field.notes": "the notes",
  "field.total": "the totals",
  "field.generic": "the invoice",

  "invoices.title": "My invoices",
  "invoices.loading": "Loading invoices…",
  "invoices.empty": "You don't have any saved invoices yet.",
  "invoices.noCustomer": "No customer",
  "invoices.delete": "Delete",
  "invoices.loaded": "Invoice {number} loaded.",
  "invoices.saved": "Invoice {number} saved.",
  "invoices.saving": "Saving…",
  "invoices.deleted": "Invoice {number} deleted.",
  "invoices.confirmDelete":
    "Delete invoice {number}? This action cannot be undone.",
  "invoices.confirmNew":
    "Create a new invoice? Unsaved changes will be lost.",
  "invoices.confirmLogout": "Sign out? Unsaved changes will be lost.",
  "invoices.loadingNumber": "Loading…",

  "statistics.title": "Income tracking",
  "statistics.loading": "Calculating income…",
  "statistics.week": "This week",
  "statistics.month": "This month",
  "statistics.year": "This year",
  "statistics.paidInvoices": "{count} paid invoices",
  "statistics.paidInvoice": "{count} paid invoice",
  "statistics.note": "Only invoices marked as paid are included.",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint":
    "Choose the language for the interface and PDFs. Notes you have already written are not translated.",
  "settings.spanish": "Spanish",
  "settings.english": "English",

  "pdf.invoice": "INVOICE",
  "pdf.billedTo": "BILLED TO",
  "pdf.issueDate": "ISSUE DATE",
  "pdf.dueDate": "DUE DATE",
  "pdf.notes": "NOTES",
  "pdf.page": "Page {page} of {total}",
  "pdf.filenameFallback": "invoice",

  "apiError.nameRequired": "Name is required.",
  "apiError.nameTooLong": "The name is too long.",
  "apiError.emailInvalid": "The email is not valid.",
  "apiError.emailTooLong": "The email is too long.",
  "apiError.passwordMin": "Password must be at least 8 characters.",
  "apiError.passwordTooLong": "The password is too long.",
  "apiError.passwordRequired": "The password is required.",
  "apiError.emailTaken": "An account with that email already exists.",
  "apiError.invalidCredentials": "Incorrect email or password.",
  "apiError.authRequired": "Sign in to continue.",
  "apiError.dateRequired": "The date is required.",
  "apiError.dateInvalid": "The date is not valid.",
  "apiError.numberRequired": "The invoice number is required.",
  "apiError.numberTooLong": "The invoice number is too long.",
  "apiError.currencyFormat": "The currency must be a 3-letter ISO code.",
  "apiError.customerNameRequired": "The customer name is required.",
  "apiError.customerNameTooLong": "The customer name is too long.",
  "apiError.customerEmailInvalid": "The customer email is not valid.",
  "apiError.descriptionRequired": "Every line item needs a description.",
  "apiError.descriptionTooLong": "The description is too long.",
  "apiError.quantityPositive": "The quantity must be greater than 0.",
  "apiError.priceNegative": "The price cannot be negative.",
  "apiError.itemsRequired": "The invoice needs at least one line item.",
  "apiError.notesTooLong": "The notes are too long.",
  "apiError.invalidData": "Invalid data.",
  "apiError.invoiceNotFound": "Invoice not found.",
  "apiError.invoiceInvalid": "Invalid invoice data.",
  "apiError.duplicateNumber":
    "An invoice with that number already exists.",
  "apiError.routeNotFound": "Route not found.",
  "apiError.invalidJson": "The request body is not valid JSON.",
  "apiError.internal": "Internal server error.",
};

const dictionaries: Record<Language, Dictionary> = { es, en };

const STATUS_KEYS: Record<InvoiceStatus, TranslationKey> = {
  draft: "status.draft",
  issued: "status.issued",
  partially_paid: "status.partially_paid",
  paid: "status.paid",
  overdue: "status.overdue",
  cancelled: "status.cancelled",
};

const API_ERROR_MESSAGES: Array<[string, TranslationKey]> = [
  ["La contraseña debe tener al menos 8 caracteres.", "apiError.passwordMin"],
  ["La contraseña es demasiado larga.", "apiError.passwordTooLong"],
  ["La contraseña es obligatoria.", "apiError.passwordRequired"],
  ["Ya existe una factura con ese número.", "apiError.duplicateNumber"],
  ["Ya existe una cuenta con ese correo.", "apiError.emailTaken"],
  ["Correo o contraseña incorrectos.", "apiError.invalidCredentials"],
  ["Inicia sesión para continuar.", "apiError.authRequired"],
  ["El cuerpo de la petición no es JSON válido.", "apiError.invalidJson"],
  ["El nombre del cliente es demasiado largo.", "apiError.customerNameTooLong"],
  ["El nombre del cliente es obligatorio.", "apiError.customerNameRequired"],
  ["El correo del cliente no es válido.", "apiError.customerEmailInvalid"],
  ["El número de factura es demasiado largo.", "apiError.numberTooLong"],
  ["El número de factura es obligatorio.", "apiError.numberRequired"],
  ["El nombre es demasiado largo.", "apiError.nameTooLong"],
  ["El nombre es obligatorio.", "apiError.nameRequired"],
  ["El correo es demasiado largo.", "apiError.emailTooLong"],
  ["El correo no es válido.", "apiError.emailInvalid"],
  ["El precio no puede ser negativo.", "apiError.priceNegative"],
  ["La cantidad debe ser mayor que 0.", "apiError.quantityPositive"],
  ["Todas las líneas necesitan una descripción.", "apiError.descriptionRequired"],
  ["La descripción es demasiado larga.", "apiError.descriptionTooLong"],
  ["La factura necesita al menos una línea.", "apiError.itemsRequired"],
  ["Las notas son demasiado largas.", "apiError.notesTooLong"],
  ["La fecha es obligatoria.", "apiError.dateRequired"],
  ["La fecha no es válida.", "apiError.dateInvalid"],
  ["La moneda debe ser un código ISO de 3 letras.", "apiError.currencyFormat"],
  ["Datos de factura no válidos.", "apiError.invoiceInvalid"],
  ["Factura no encontrada.", "apiError.invoiceNotFound"],
  ["Datos no válidos.", "apiError.invalidData"],
  ["Ruta no encontrada.", "apiError.routeNotFound"],
  ["Error interno del servidor.", "apiError.internal"],
];

let currentLanguage: Language = detectLanguage();

export type TranslationKey = keyof Dictionary;

export function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "es" || stored === "en") return stored;
  } catch {
    // localStorage no disponible.
  }

  const browserLanguage = navigator.language?.toLowerCase() ?? "";

  return browserLanguage.startsWith("en") ? "en" : "es";
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function getLocale(language: Language = currentLanguage): string {
  return language === "en" ? "en-US" : "es-ES";
}

export function initI18n(): void {
  currentLanguage = detectLanguage();
  applyTranslations(document);
}

export function setLanguage(
  language: Language,
  options: { persist?: boolean; apply?: boolean } = {},
): void {
  currentLanguage = language;

  if (options.persist !== false) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // localStorage no disponible.
    }
  }

  if (options.apply !== false) {
    applyTranslations(document);
  }

  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { language } }),
  );
}

export function t(key: TranslationKey, vars?: TranslationVars): string {
  const template = dictionaries[currentLanguage][key] ?? dictionaries.es[key];

  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function statusLabel(status: InvoiceStatus): string {
  return t(STATUS_KEYS[status]);
}

export function applyTranslations(root: ParentNode = document): void {
  document.documentElement.lang = currentLanguage;
  document.title = t("app.title");

  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (description) {
    description.content = t("app.description");
  }

  root
    .querySelectorAll<HTMLElement>("[data-i18n]")
    .forEach((element) => {
      const key = element.getAttribute("data-i18n");

      if (key) {
        element.textContent = t(key as TranslationKey);
      }
    });

  root
    .querySelectorAll<HTMLElement>("[data-i18n-placeholder]")
    .forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");

      if (key) {
        element.setAttribute("placeholder", t(key as TranslationKey));
      }
    });

  root
    .querySelectorAll<HTMLElement>("[data-i18n-aria-label]")
    .forEach((element) => {
      const key = element.getAttribute("data-i18n-aria-label");

      if (key) {
        element.setAttribute("aria-label", t(key as TranslationKey));
      }
    });

  root
    .querySelectorAll<HTMLElement>("[data-i18n-title]")
    .forEach((element) => {
      const key = element.getAttribute("data-i18n-title");

      if (key) {
        element.setAttribute("title", t(key as TranslationKey));
      }
    });
}

export function formatMoney(
  value: number,
  currency: string,
  language: Language = currentLanguage,
  currencyDisplay: "symbol" | "code" = "symbol",
): string {
  const code = (currency || "USD").trim().toUpperCase() || "USD";

  try {
    return new Intl.NumberFormat(getLocale(language), {
      style: "currency",
      currency: code,
      currencyDisplay,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`.trim();
  }
}

export function formatQuantity(
  value: number,
  language: Language = currentLanguage,
): string {
  return new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(
  isoDate: string,
  language: Language = currentLanguage,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  const [, year, month, day] = match ?? [];

  if (!year || !month || !day) return "—";

  return language === "en"
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
}

export function translateApiError(message: string): string {
  if (currentLanguage === "es") return message;

  let result = message;

  for (const [source, key] of API_ERROR_MESSAGES) {
    if (result.includes(source)) {
      result = result.replace(source, t(key));
    }
  }

  return result;
}

export function validationFieldLabel(path: string): string {
  if (path === "number") return t("field.number");
  if (path === "customer.name") return t("field.customerName");
  if (path === "currency") return t("field.currency");
  if (path === "issueDate") return t("field.issueDate");
  if (path === "dueDate") return t("field.dueDate");
  if (path === "notes") return t("field.notes");
  if (path === "items") return t("field.items");

  if (/^items\.\d+\.description$/.test(path)) {
    return t("field.itemDescription");
  }

  if (
    path === "total" ||
    path === "subtotal" ||
    path === "taxTotal" ||
    path === "discountTotal" ||
    /\.(lineSubtotal|lineTax|lineTotal)$/.test(path)
  ) {
    return t("field.total");
  }

  return t("field.generic");
}

export function validationIssueMessage(path: string, message: string): string {
  if (message.includes("lineTotal")) {
    return t("validation.lineTotalMismatch");
  }

  if (message.includes("dueDate no puede")) {
    return t("validation.dueDateOrder");
  }

  if (message.includes("total debe ser")) {
    return t("validation.totalMismatch");
  }

  if (path === "number") return t("validation.numberRequired");
  if (path === "customer.name") return t("validation.customerNameRequired");
  if (path === "currency") return t("validation.currencyFormat");
  if (path === "items") return t("validation.itemsRequired");

  if (/^items\.\d+\.description$/.test(path)) {
    return t("validation.descriptionRequired");
  }

  if (path === "issueDate" || path === "dueDate") {
    return t("validation.dateInvalid");
  }

  if (
    path === "total" ||
    path === "subtotal" ||
    path === "taxTotal" ||
    path === "discountTotal" ||
    /\.(lineSubtotal|lineTax|lineTotal)$/.test(path)
  ) {
    return t("validation.amountInvalid");
  }

  return translateApiError(message);
}
