// ---------------------------------------------------------------------------
// Formato y parseo de números / fechas (locale es-AR)
// ---------------------------------------------------------------------------

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Formatea un número como moneda ARS sin decimales: $1.234.567 */
export const fmt = (n) => arsFormatter.format(Number.isFinite(n) ? n : 0);

/** Porcentaje de `v` sobre `total`, con 1 decimal. Devuelve 0 si total es 0. */
export const pct = (v, total) => (total > 0 ? ((v / total) * 100).toFixed(1) : "0.0");

/**
 * Parsea un valor de celda a número.
 * Acepta:
 *   - números nativos (Google Sheets `valueRenderOption` numérico)
 *   - strings es-AR: "2.653.219,64", "$ 1.455", "1455"
 *   - strings en-US: "2,653,219.64"
 * Devuelve 0 para vacíos / no parseables.
 */
export function parseNumber(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

  let s = String(raw).trim();
  if (!s) return 0;

  // Quitar símbolos de moneda, espacios y caracteres no numéricos de borde
  s = s.replace(/[^\d.,\-]/g, "");
  if (!s || s === "-") return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // El último separador que aparece es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // formato es-AR: punto = miles, coma = decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // formato en-US: coma = miles, punto = decimal
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // sólo coma -> decimal es-AR
    s = s.replace(",", ".");
  }
  // sólo punto -> ya es decimal válido

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Meses (para ordenar el historial cronológicamente)
// ---------------------------------------------------------------------------

const MONTH_INDEX = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
};

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const stripAccents = (str) =>
  str.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Detecta si el título de una hoja es un mes válido tipo "Mayo-2026",
 * "Mayo 2026", "mayo_2026". Devuelve metadatos para ordenar, o null.
 */
export function parseMonthTitle(title) {
  if (!title) return null;
  const cleaned = stripAccents(String(title).trim().toLowerCase());
  const match = cleaned.match(/^([a-z]+)[\s\-_/]+(\d{4})$/);
  if (!match) return null;

  const monthIdx = MONTH_INDEX[match[1]];
  if (monthIdx === undefined) return null;

  const year = parseInt(match[2], 10);
  return {
    title,            // título original de la hoja, para llamar a la API
    monthIdx,
    year,
    short: MONTH_SHORT[monthIdx],
    label: `${MONTH_SHORT[monthIdx]} ${year}`,
    sort: year * 12 + monthIdx,
  };
}

/** Normaliza nombre de persona a "Iván" | "Mica" | el valor original. */
export function normalizePerson(raw) {
  if (!raw) return "—";
  const key = stripAccents(String(raw).trim().toLowerCase());
  if (key.startsWith("iva")) return "Iván";
  if (key.startsWith("mic")) return "Mica";
  return String(raw).trim();
}

export { stripAccents };
