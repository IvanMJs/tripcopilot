// ---------------------------------------------------------------------------
// Conexión a Google Sheets (API key, sólo lectura) + agregación de datos
// ---------------------------------------------------------------------------
import { parseNumber, parseMonthTitle, normalizePerson, stripAccents } from "./format";

const API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export const IVAN = "Iván";
export const MICA = "Mica";

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
export const TC = parseNumber(import.meta.env.VITE_USD_ARS) || 1455;

// Mapeo de encabezados -> campo interno. Se normaliza (minúsculas, sin acentos).
const HEADER_MATCHERS = [
  { field: "concepto", test: (h) => h.includes("concepto") || h.includes("descrip") },
  { field: "categoria", test: (h) => h.includes("categor") || h.includes("rubro") },
  { field: "fecha", test: (h) => h.includes("fecha") },
  { field: "montoUsd", test: (h) => h.includes("usd") || h.includes("dolar") },
  { field: "montoArs", test: (h) => h.includes("ars") || h.includes("peso") || h === "monto" },
  { field: "persona", test: (h) => h.includes("persona") || h.includes("quien") || h.includes("quién") },
];

// Orden fijo de columnas si la hoja no trae encabezados reconocibles.
const FALLBACK_ORDER = ["concepto", "categoria", "fecha", "montoArs", "montoUsd", "persona"];

function assertConfig() {
  if (!API_KEY) throw new Error("Falta VITE_GOOGLE_SHEETS_API_KEY en el entorno.");
  if (!SHEET_ID) throw new Error("Falta VITE_GOOGLE_SHEET_ID en el entorno.");
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch {
      /* ignore */
    }
    if (res.status === 403)
      throw new Error(
        "Google Sheets devolvió 403. Revisá que el spreadsheet esté compartido como " +
          "'Cualquiera con el enlace · Lector' y que la API key tenga habilitada la Sheets API. " +
          (detail ? `(${detail})` : "")
      );
    throw new Error(`Error ${res.status} de Google Sheets. ${detail}`);
  }
  return res.json();
}

/** Lista los títulos de todas las hojas (tabs) del spreadsheet. */
async function fetchSheetTitles() {
  const url = `${API_BASE}/${SHEET_ID}?fields=sheets.properties.title&key=${API_KEY}`;
  const data = await getJson(url);
  return (data.sheets || []).map((s) => s.properties.title);
}

/** Trae los valores de varias hojas en una sola llamada (batchGet). */
async function fetchValues(titles) {
  if (titles.length === 0) return {};
  const ranges = titles
    .map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'`)}`)
    .join("&");
  const url =
    `${API_BASE}/${SHEET_ID}/values:batchGet?${ranges}` +
    `&valueRenderOption=UNFORMATTED_VALUE&key=${API_KEY}`;
  const data = await getJson(url);
  const out = {};
  (data.valueRanges || []).forEach((vr, i) => {
    out[titles[i]] = vr.values || [];
  });
  return out;
}

/** Construye el índice de columnas a partir de la fila de encabezados. */
function buildColumnIndex(headerRow) {
  const index = {};
  let matched = 0;
  headerRow.forEach((cell, i) => {
    const h = stripAccents(String(cell || "").trim().toLowerCase());
    if (!h) return;
    for (const m of HEADER_MATCHERS) {
      if (index[m.field] === undefined && m.test(h)) {
        index[m.field] = i;
        matched++;
        break;
      }
    }
  });
  if (matched >= 2) return index;
  // Sin encabezados reconocibles -> orden fijo
  return FALLBACK_ORDER.reduce((acc, field, i) => ({ ...acc, [field]: i }), {});
}

/** Convierte las filas crudas de una hoja en una lista de gastos normalizados. */
function parseRows(rows) {
  if (!rows || rows.length === 0) return [];

  // ¿La primera fila es encabezado? Lo es si contiene texto reconocible.
  const first = rows[0] || [];
  const firstNorm = first.map((c) => stripAccents(String(c || "").toLowerCase()));
  const looksLikeHeader =
    firstNorm.some((h) => h.includes("concepto") || h.includes("categor")) ||
    firstNorm.some((h) => h.includes("ars") || h.includes("usd"));

  const idx = buildColumnIndex(looksLikeHeader ? first : []);
  const body = looksLikeHeader ? rows.slice(1) : rows;

  const at = (row, field) => (idx[field] != null ? row[idx[field]] : undefined);

  return body
    .map((row) => {
      const montoArs = parseNumber(at(row, "montoArs"));
      const montoUsd = parseNumber(at(row, "montoUsd"));
      const concepto = String(at(row, "concepto") ?? "").trim();
      const categoria = String(at(row, "categoria") ?? "").trim() || "Sin categoría";
      const fecha = at(row, "fecha") ?? "";
      const persona = normalizePerson(at(row, "persona"));
      const unified = montoArs + montoUsd * TC;
      return { concepto, categoria, fecha, montoArs, montoUsd, persona, unified };
    })
    // Descartar filas vacías o sin monto
    .filter((e) => (e.concepto || e.montoArs || e.montoUsd) && e.unified > 0);
}

function emptyPersonTotals() {
  return { ars: 0, usd: 0, unified: 0 };
}

/** Agrega los gastos de un mes en totales por persona y por categoría. */
function aggregateMonth(meta, expenses) {
  const people = { [IVAN]: emptyPersonTotals(), [MICA]: emptyPersonTotals() };
  const catMaps = { [IVAN]: new Map(), [MICA]: new Map() };

  for (const e of expenses) {
    if (!people[e.persona]) {
      people[e.persona] = emptyPersonTotals();
      catMaps[e.persona] = new Map();
    }
    people[e.persona].ars += e.montoArs;
    people[e.persona].usd += e.montoUsd;
    people[e.persona].unified += e.unified;

    const cm = catMaps[e.persona];
    cm.set(e.categoria, (cm.get(e.categoria) || 0) + e.unified);
  }

  const categories = {};
  for (const person of Object.keys(catMaps)) {
    categories[person] = [...catMaps[person].entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  const combined = Object.values(people).reduce((s, p) => s + p.unified, 0);
  const totalUsd = Object.values(people).reduce((s, p) => s + p.usd, 0);

  return {
    key: meta.title,
    label: meta.label,
    short: meta.short,
    sort: meta.sort,
    expenses,
    people,
    categories,
    combined,
    totalUsd,
  };
}

/**
 * Punto de entrada: lee el spreadsheet completo y devuelve el dataset listo
 * para la UI. Lanza Error con mensaje claro si algo falla.
 */
export async function loadDataset() {
  assertConfig();

  const titles = await fetchSheetTitles();
  const monthMetas = titles
    .map(parseMonthTitle)
    .filter(Boolean)
    .sort((a, b) => a.sort - b.sort);

  if (monthMetas.length === 0) {
    throw new Error(
      "No se encontraron hojas con formato de mes (ej. 'Mayo-2026'). " +
        `Hojas disponibles: ${titles.join(", ") || "ninguna"}.`
    );
  }

  const valuesByTitle = await fetchValues(monthMetas.map((m) => m.title));

  const months = monthMetas.map((meta) =>
    aggregateMonth(meta, parseRows(valuesByTitle[meta.title]))
  );

  const historic = months.map((m) => ({
    mes: m.short,
    sort: m.sort,
    [IVAN]: m.people[IVAN]?.unified || 0,
    [MICA]: m.people[MICA]?.unified || 0,
    total: m.combined,
  }));

  return { tc: TC, months, historic };
}
