// ── Packing List — pure rule-based logic ──────────────────────────────────

export type PackingCategory =
  | "documents"
  | "clothes"
  | "toiletries"
  | "electronics"
  | "destination";

export interface PackingItem {
  id: string;
  label: string;
  category: PackingCategory;
  essential: boolean;
}

/** Build a deterministic ID for a rule-based item so localStorage checks survive re-renders. */
function makeId(category: PackingCategory, label: string): string {
  return `${category}:${label.toLowerCase().replace(/\s+/g, "-")}`;
}

function item(
  category: PackingCategory,
  label: string,
  essential = false,
): PackingItem {
  return { id: makeId(category, label), label, category, essential };
}

// ── Rule tables ────────────────────────────────────────────────────────────

const DOCUMENTS_ALWAYS: PackingItem[] = [
  item("documents", "Pasaporte / DNI", true),
  item("documents", "Boarding pass / e-ticket", true),
  item("documents", "Seguro de viaje", false),
  item("documents", "Reservas de hotel", false),
];

const CLOTHES_BASE: PackingItem[] = [
  item("clothes", "Ropa interior", true),
  item("clothes", "Calcetines", true),
  item("clothes", "Camisetas", true),
  item("clothes", "Pantalón cómodo", true),
];

const CLOTHES_COLD: PackingItem[] = [
  item("clothes", "Abrigo o chaqueta", true),
  item("clothes", "Buzo / sweater", true),
  item("clothes", "Bufanda y guantes", false),
];

const CLOTHES_BEACH: PackingItem[] = [
  item("clothes", "Traje de baño", true),
  item("clothes", "Sandalias", true),
  item("clothes", "Ropa liviana", true),
];

const CLOTHES_FORMAL: PackingItem[] = [
  item("clothes", "Ropa formal", false),
  item("clothes", "Zapatos formales", false),
];

const TOILETRIES_ALWAYS: PackingItem[] = [
  item("toiletries", "Cepillo y pasta de dientes", true),
  item("toiletries", "Shampoo y acondicionador", true),
  item("toiletries", "Desodorante", true),
  item("toiletries", "Protector solar", false),
  item("toiletries", "Medicamentos personales", true),
];

const TOILETRIES_LONG: PackingItem[] = [
  item("toiletries", "Afeitadora", false),
  item("toiletries", "Perfume / colonia", false),
];

const ELECTRONICS_ALWAYS: PackingItem[] = [
  item("electronics", "Cargador de celular", true),
  item("electronics", "Adaptador de corriente", false),
  item("electronics", "Power bank", false),
  item("electronics", "Auriculares", false),
];

const ELECTRONICS_LONG: PackingItem[] = [
  item("electronics", "Laptop / tablet", false),
  item("electronics", "Cámara fotográfica", false),
];

// ── Destination-specific rules ─────────────────────────────────────────────

type DestinationRule = {
  keywords: string[];
  items: PackingItem[];
};

const DESTINATION_RULES: DestinationRule[] = [
  {
    keywords: ["beach", "playa", "cancun", "caribe", "caribbean", "miami", "bali", "hawaii", "punta"],
    items: [
      item("destination", "Crema bronceadora SPF50+", true),
      item("destination", "Anteojos de sol", true),
      item("destination", "Repelente de mosquitos", false),
    ],
  },
  {
    keywords: ["ski", "nieve", "snow", "aspen", "whistler", "bariloche"],
    items: [
      item("destination", "Ropa térmica", true),
      item("destination", "Gafas de ski", true),
      item("destination", "Casco de ski", false),
    ],
  },
  {
    keywords: ["safari", "africa", "kenya", "tanzania", "kruger"],
    items: [
      item("destination", "Ropa en tonos neutros", true),
      item("destination", "Repelente antimosquitos fuerte", true),
      item("destination", "Binoculares", false),
    ],
  },
  {
    keywords: ["japan", "japón", "tokyo", "osaka", "kyoto"],
    items: [
      item("destination", "Tarjeta IC / Pasmo / Suica", false),
      item("destination", "Calcetines sin agujeros (templos)", true),
      item("destination", "Bolsas plásticas (para basura, pocas papeleras)", false),
    ],
  },
  {
    keywords: ["europa", "europe", "paris", "rome", "roma", "london", "berlin", "amsterdam"],
    items: [
      item("destination", "Paraguas compacto", false),
      item("destination", "Adaptador enchufes europeos", true),
    ],
  },
  {
    keywords: ["hiking", "trekking", "mountains", "montaña", "patagonia", "caminata"],
    items: [
      item("destination", "Botas de trekking", true),
      item("destination", "Mochila para día", true),
      item("destination", "Bastones de trekking", false),
    ],
  },
];

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Generate a rule-based packing list.
 * @param destination  Free-text destination name (used for keyword matching).
 * @param durationDays Trip duration in days.
 * @param tempC        Expected temperature in Celsius at destination.
 * @param activities   Optional list of activity keywords (e.g. ["hiking", "beach"]).
 */
export function generatePackingList(
  destination: string,
  durationDays: number,
  tempC: number,
  activities: string[] = [],
): PackingItem[] {
  const items: PackingItem[] = [];
  const destLower = destination.toLowerCase();
  const activitiesLower = activities.map((a) => a.toLowerCase());
  const searchTerms = [destLower, ...activitiesLower].join(" ");

  // Documents — always
  items.push(...DOCUMENTS_ALWAYS);

  // Visa note for longer trips
  if (durationDays >= 7) {
    items.push(item("documents", "Visa / permisos de entrada", false));
  }

  // Clothes base
  items.push(...CLOTHES_BASE);

  // Clothes by temperature
  if (tempC < 15) {
    items.push(...CLOTHES_COLD);
  } else if (tempC >= 25) {
    items.push(...CLOTHES_BEACH);
  }

  // Formal clothes for longer trips
  if (durationDays >= 5) {
    items.push(...CLOTHES_FORMAL);
  }

  // Extra sets of clothes for longer trips
  if (durationDays >= 7) {
    items.push(item("clothes", "Ropa extra (viaje largo)", false));
  }

  // Toiletries
  items.push(...TOILETRIES_ALWAYS);
  if (durationDays >= 5) {
    items.push(...TOILETRIES_LONG);
  }

  // Electronics base
  items.push(...ELECTRONICS_ALWAYS);
  if (durationDays >= 3) {
    items.push(...ELECTRONICS_LONG);
  }

  // Destination-specific items
  for (const rule of DESTINATION_RULES) {
    const matched = rule.keywords.some((kw) => searchTerms.includes(kw));
    if (matched) {
      items.push(...rule.items);
    }
  }

  // Deduplicate by id (destination rules might overlap)
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}
