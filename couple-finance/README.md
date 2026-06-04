# Couple Finance · Iván & Mica

Dashboard de gastos de pareja, mes a mes, con datos **en vivo desde Google Sheets**.
Convierte montos en USD a ARS con un tipo de cambio configurable y muestra un total
unificado, distribución por persona, detalle por categoría e historial mensual.

Stack: **React 18 + Vite 5 + Recharts**. Pensado para desplegar en **Vercel**.

---

## Cómo funciona

La app lee un Google Spreadsheet y detecta automáticamente cada hoja cuyo título
tenga formato de mes: `Mayo-2026`, `Junio 2026`, `Julio_2026`, etc. No hace falta
tocar código cuando agregás un mes nuevo: aparece solo.

Cada hoja debe tener estas columnas (los encabezados se detectan por nombre, en
cualquier orden; si no hay encabezados, se asume este orden):

| Concepto | Categoría | Fecha | Monto ARS | Monto USD | Persona |
|----------|-----------|-------|-----------|-----------|---------|
| Vuelo NY | Viaje     | 12/05 | 0         | 373.50    | Iván    |
| Alquiler | Hogar     | 01/05 | 435000    | 0         | Mica    |

- **Persona** se normaliza a `Iván` o `Mica` (acepta variantes sin acento).
- El total unificado de cada gasto es `Monto ARS + (Monto USD × tipo de cambio)`.

---

## Configuración

Copiá `.env.example` a `.env` y completá:

```env
VITE_GOOGLE_SHEETS_API_KEY=tu_api_key
VITE_GOOGLE_SHEET_ID=1-RsV3D2_SC4XhghXnaxHzE5U06falvQYgTCMoi_KoXk
VITE_USD_ARS=1455
```

### El spreadsheet debe ser legible con API key

Con una API key (sin OAuth) Google Sheets sólo deja leer hojas **públicas**.
En el Sheet: **Compartir → Acceso general → "Cualquier persona con el enlace" → Lector**.

### ⚠️ Seguridad de la API key

Vite incrusta las variables `VITE_*` en el bundle del navegador, así que la API key
queda **visible en el cliente**. Para una key de sólo lectura sobre un Sheet público
el riesgo es bajo, pero conviene **restringirla** en Google Cloud Console:

1. APIs & Services → Credentials → la API key.
2. **Application restrictions** → HTTP referrers → agregá tu dominio de Vercel
   (`https://couple-finance.vercel.app/*`) y `http://localhost:5173/*`.
3. **API restrictions** → limitá a **Google Sheets API** únicamente.

> Si en el futuro querés ocultar del todo la key, conviene migrar a un backend/serverless
> (p. ej. Next.js API route o una función de Vercel) que haga el fetch del lado del servidor.

---

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve el build de producción
```

---

## Deploy en Vercel

1. Importá el repo en Vercel (framework detectado: **Vite**).
2. Cargá las variables de entorno `VITE_GOOGLE_SHEETS_API_KEY`,
   `VITE_GOOGLE_SHEET_ID` y `VITE_USD_ARS` en **Project → Settings → Environment Variables**.
3. Deploy. `vercel.json` ya incluye el rewrite SPA.

---

## Estructura

```
couple-finance/
├── index.html
├── vite.config.js
├── vercel.json
└── src/
    ├── main.jsx
    ├── App.jsx                  # UI: Resumen / Detalle / Historial
    ├── index.css
    ├── components/
    │   └── CustomTooltip.jsx
    ├── hooks/
    │   └── useSheetData.js      # carga + estados loading/error
    └── lib/
        ├── sheets.js            # fetch a Google Sheets + agregación
        └── format.js            # parseo de números/meses, formato es-AR
```
