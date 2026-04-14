export interface ChecklistItem {
  id: string;
  labelEs: string;
  labelEn: string;
  category: "documents" | "luggage" | "tech" | "health" | "transport";
  checked: boolean;
}

export interface ChecklistCategory {
  id: "documents" | "luggage" | "tech" | "health" | "transport";
  labelEs: string;
  labelEn: string;
  emoji: string;
}

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  { id: "documents", labelEs: "Documentos",  labelEn: "Documents",  emoji: "📄" },
  { id: "luggage",   labelEs: "Equipaje",    labelEn: "Luggage",    emoji: "🧳" },
  { id: "tech",      labelEs: "Tecnología",  labelEn: "Tech",       emoji: "📱" },
  { id: "health",    labelEs: "Salud",       labelEn: "Health",     emoji: "💊" },
  { id: "transport", labelEs: "Transporte",  labelEn: "Transport",  emoji: "🚗" },
];

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // documents
  { id: "doc-passport",     labelEs: "Pasaporte",                labelEn: "Passport",               category: "documents", checked: false },
  { id: "doc-boarding",     labelEs: "Tarjeta de embarque",      labelEn: "Boarding pass",           category: "documents", checked: false },
  { id: "doc-visa",         labelEs: "Visa (si aplica)",         labelEn: "Visa (if needed)",        category: "documents", checked: false },
  { id: "doc-hotel",        labelEs: "Confirmación de hotel",    labelEn: "Hotel confirmation",      category: "documents", checked: false },
  { id: "doc-insurance",    labelEs: "Seguro de viaje",          labelEn: "Travel insurance",        category: "documents", checked: false },
  { id: "doc-id",           labelEs: "DNI / Cédula",             labelEn: "ID / DNI",                category: "documents", checked: false },
  // luggage
  { id: "lug-carry-on",     labelEs: "Maleta de mano lista",     labelEn: "Carry-on packed",         category: "luggage",   checked: false },
  { id: "lug-checked",      labelEs: "Maleta facturada lista",   labelEn: "Checked bag packed",      category: "luggage",   checked: false },
  { id: "lug-liquids",      labelEs: "Líquidos en bolsa clara",  labelEn: "Liquids in clear bag",    category: "luggage",   checked: false },
  { id: "lug-chargers",     labelEs: "Cargadores y adaptadores", labelEn: "Chargers & adapters",     category: "luggage",   checked: false },
  { id: "lug-medications",  labelEs: "Medicamentos",             labelEn: "Medications",             category: "luggage",   checked: false },
  // tech
  { id: "tec-phone",        labelEs: "Teléfono cargado",         labelEn: "Phone charged",           category: "tech",      checked: false },
  { id: "tec-offline-maps", labelEs: "Mapas offline descargados",labelEn: "Download offline maps",   category: "tech",      checked: false },
  { id: "tec-boarding-app", labelEs: "Pase guardado en app",     labelEn: "Save boarding pass",      category: "tech",      checked: false },
  { id: "tec-airplane-mode",labelEs: "Recordatorio modo avión",  labelEn: "Enable airplane mode reminder", category: "tech", checked: false },
  // health
  { id: "hlt-vaccines",     labelEs: "Vacunas requeridas",       labelEn: "Required vaccinations",   category: "health",    checked: false },
  { id: "hlt-masks",        labelEs: "Mascarillas / gel",        labelEn: "Masks / hand sanitizer",  category: "health",    checked: false },
  { id: "hlt-first-aid",    labelEs: "Botiquín de viaje",        labelEn: "Travel first aid kit",    category: "health",    checked: false },
  { id: "hlt-prescription", labelEs: "Medicamentos recetados",   labelEn: "Prescription medications",category: "health",    checked: false },
  // transport
  { id: "trn-transfer",     labelEs: "Traslado al aeropuerto",   labelEn: "Airport transfer booked", category: "transport", checked: false },
  { id: "trn-parking",      labelEs: "Estacionamiento reservado",labelEn: "Parking reserved",        category: "transport", checked: false },
  { id: "trn-pet-sitter",   labelEs: "Cuidador de mascotas",     labelEn: "Pet sitter arranged",     category: "transport", checked: false },
  { id: "trn-home",         labelEs: "Casa asegurada (luces/llaves)", labelEn: "Home security (lights/locks)", category: "transport", checked: false },
];

export function getItemsByCategory(
  items: ChecklistItem[],
  categoryId: ChecklistCategory["id"],
): ChecklistItem[] {
  return items.filter((item) => item.category === categoryId);
}

export function countChecked(items: ChecklistItem[]): { checked: number; total: number } {
  return { checked: items.filter((i) => i.checked).length, total: items.length };
}
