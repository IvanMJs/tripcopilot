import { TripTab } from "@/lib/types";

const DB_NAME = "tripcopilot";
const STORE   = "trips";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };

    req.onsuccess  = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror    = () => reject(req.error);
  });
}

export async function cacheTrips(trips: TripTab[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(trips, "all");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently ignore — cache is best-effort
  }
}

export async function getCachedTrips(): Promise<TripTab[] | null> {
  try {
    const db  = await openDB();
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get("all");
    const result = await new Promise<TripTab[] | null>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as TripTab[]) ?? null);
      req.onerror   = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearCachedTrips(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete("all");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently ignore
  }
}
