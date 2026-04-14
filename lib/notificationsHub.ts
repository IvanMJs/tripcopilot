const STORAGE_KEY = "tc-hub-notifications";
const MAX_NOTIFICATIONS = 50;

export interface HubNotification {
  id: string;
  type: "flight" | "weather" | "badge" | "checkin" | "system";
  title: string;
  body: string;
  tripId?: string;
  timestamp: number;
  read: boolean;
}

function readStorage(): HubNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HubNotification[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(notifications: HubNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

/** Returns all notifications sorted by timestamp descending (newest first). */
export function getHubNotifications(): HubNotification[] {
  if (typeof window === "undefined") return [];
  const notifications = readStorage();
  return [...notifications].sort((a, b) => b.timestamp - a.timestamp);
}

/** Adds a new notification, capped at MAX_NOTIFICATIONS entries. */
export function addHubNotification(
  n: Omit<HubNotification, "id" | "timestamp" | "read">,
): void {
  if (typeof window === "undefined") return;
  const notifications = readStorage();
  const newNotification: HubNotification = {
    ...n,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    read: false,
  };
  const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  writeStorage(updated);
}

/** Marks all notifications as read. */
export function markAllRead(): void {
  if (typeof window === "undefined") return;
  const notifications = readStorage();
  writeStorage(notifications.map((n) => ({ ...n, read: true })));
}

/** Removes all notifications. */
export function clearAll(): void {
  if (typeof window === "undefined") return;
  writeStorage([]);
}

/** Returns the count of unread notifications. */
export function getUnreadCount(): number {
  if (typeof window === "undefined") return 0;
  return readStorage().filter((n) => !n.read).length;
}
