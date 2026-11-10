# INV-DDS-PRO

Aplicación de facturación con TypeScript, Vite, Express y SQLite.

## Funcionalidades

- Registro e inicio de sesión con sesiones seguras.
- Cada usuario solo puede ver y editar sus propias facturas.
- Edición de factura, cliente, fechas, estado y moneda.
- Líneas de factura con cantidad, precio, descuento e impuesto.
- Cálculo automático de subtotales, descuentos, impuestos y total.
- Guardado, listado, carga y eliminación de facturas.
- Control de ingresos con totales por semana, mes y año (solo facturas pagadas).
- Validación compartida con Zod en cliente y servidor.
- Descarga de PDF vectorial con jsPDF.
- Impresión directa y diseño responsive.
- Idioma español/inglés, persistente en el navegador, incluido en formatos y PDF.

## Requisitos

- Node.js 20 o superior (probado con Node.js 22).
- npm.

## Desarrollo

En Windows puedes iniciar la aplicación con doble clic en `INICIAR-APP.bat`.
No abras `index.html` directamente: la autenticación y los controles requieren el servidor local.

```bash
npm install
npm run dev
```

- Interfaz: `http://localhost:5173`
- API: `http://127.0.0.1:3001` (Vite redirige `/api` al backend)

La primera vez, pulsa **Crear cuenta** en la pantalla de acceso.

## Idioma

- En la pantalla de acceso, usa el selector **ES / EN** situado arriba.
- Con la sesión iniciada, abre **Ajustes** y selecciona el idioma.
- El idioma se guarda en el navegador y afecta a la interfaz, mensajes, formatos de fecha/moneda y PDF.

## Producción

```bash
npm run build
npm start
```

La aplicación completa se sirve en `http://127.0.0.1:3001`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | API y Vite en modo desarrollo |
| `npm run dev:api` | Solo la API con recarga automática |
| `npm run dev:web` | Solo la interfaz con Vite |
| `npm run build` | Build de producción en `dist/` |
| `npm start` | Sirve la API y el build de producción |
| `npm run preview` | Sirve solo el build estático (sin API) |
| `npm run typecheck` | Comprueba los tipos con `tsc` |

## Base de datos

SQLite se crea automáticamente en `data/inv-dds-pro.db`. La carpeta `data/` no se versiona.

Variables de entorno opcionales:

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3001` | Puerto de la API |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `DB_PATH` | `data/inv-dds-pro.db` | Ruta del archivo SQLite |
| `NODE_ENV` | — | Con `production`, la cookie de sesión se marca `Secure` |

## Estructura

- `server/index.ts` — servidor Express, API y servicio del build.
- `server/db.ts` — conexión SQLite y esquema de tablas.
- `server/auth.ts` — registro, login, sesiones y contraseñas con scrypt.
- `server/invoices.ts` — CRUD de facturas con recálculo y validación en servidor.
- `server/validation.ts` — validación de cuerpos de petición con Zod.
- `src/models/invoice.ts` — modelo de dominio (`Invoice`, `InvoiceItem`, etc.).
- `src/domain/invoice-calculations.ts` — cálculo de líneas y totales.
- `src/schemas/invoice.schema.ts` — esquema Zod compartido.
- `src/pdf/invoice-pdf.ts` — generación del PDF vectorial.
- `src/main.ts` — lógica de la interfaz.
- `index.html` — estructura, estilos y pantalla de acceso.
- `vite.config.ts` — proxy `/api` hacia el backend.

## API

Todas las rutas de facturas requieren sesión iniciada.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Crea una cuenta e inicia sesión |
| `POST` | `/api/auth/login` | Inicia sesión |
| `POST` | `/api/auth/logout` | Cierra la sesión |
| `GET` | `/api/auth/me` | Usuario de la sesión actual |
| `GET` | `/api/invoices` | Lista las facturas del usuario |
| `GET` | `/api/invoices/next-number` | Siguiente número disponible |
| `GET` | `/api/invoices/:id` | Obtiene una factura completa |
| `GET` | `/api/invoices/statistics` | Ingresos por semana, mes y año |
| `POST` | `/api/invoices` | Crea una factura |
| `PUT` | `/api/invoices/:id` | Actualiza una factura |
| `DELETE` | `/api/invoices/:id` | Elimina una factura |

Los importes de las líneas y los totales se recalculan en el servidor antes de guardar; no se confía en los totales enviados por el cliente.
