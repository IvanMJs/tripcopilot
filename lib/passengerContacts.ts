export interface PassengerContact {
  id: string;
  name: string;
  email?: string;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
  dateOfBirth?: string;
  seatPreference?: string;
  mealPreference?: string;
  lastUsed: string; // ISO date
}

const STORAGE_KEY = "tripcopilot-passenger-contacts";

function generateId(name: string, passportNumber?: string): string {
  // Deterministic ID from name + passport if available
  const base = `${name.trim().toLowerCase()}|${(passportNumber ?? "").trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `contact_${Math.abs(hash).toString(36)}`;
}

export function getContacts(): PassengerContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PassengerContact[];
  } catch {
    return [];
  }
}

function setContacts(contacts: PassengerContact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function saveContact(
  contact: Omit<PassengerContact, "id" | "lastUsed">,
): PassengerContact {
  const contacts = getContacts();
  const id = generateId(contact.name, contact.passportNumber);
  const existing = contacts.find((c) => c.id === id);

  const updated: PassengerContact = {
    ...contact,
    id,
    lastUsed: new Date().toISOString(),
  };

  if (existing) {
    const next = contacts.map((c) => (c.id === id ? updated : c));
    setContacts(next);
  } else {
    setContacts([...contacts, updated]);
  }

  return updated;
}

export function removeContact(id: string): void {
  const contacts = getContacts();
  setContacts(contacts.filter((c) => c.id !== id));
}

export function touchContact(id: string): void {
  const contacts = getContacts();
  const next = contacts.map((c) =>
    c.id === id ? { ...c, lastUsed: new Date().toISOString() } : c,
  );
  setContacts(next);
}
