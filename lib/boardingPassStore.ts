export interface BoardingPass {
  id: string;
  tripId: string;
  flightId: string;
  flightNumber: string;
  route: string; // "EZE→MIA"
  date: string; // ISO date
  imageData: string; // base64 data URL
  addedAt: string;
  passengerName?: string;
}

const DB_NAME = "tripcopilot-wallet";
const STORE_NAME = "boarding-passes";
const VERSION = 1;

function openWalletDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("tripId", "tripId", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }
    };

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function initWalletDB(): Promise<IDBDatabase> {
  return openWalletDB();
}

export async function saveBoardingPass(pass: BoardingPass): Promise<void> {
  const db = await openWalletDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(pass);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getBoardingPasses(tripId: string): Promise<BoardingPass[]> {
  const db = await openWalletDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const index = tx.objectStore(STORE_NAME).index("tripId");
  const req = index.getAll(tripId);
  const result = await new Promise<BoardingPass[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as BoardingPass[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function getAllBoardingPasses(): Promise<BoardingPass[]> {
  const db = await openWalletDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const req = tx.objectStore(STORE_NAME).getAll();
  const result = await new Promise<BoardingPass[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as BoardingPass[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteBoardingPass(id: string): Promise<void> {
  const db = await openWalletDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Compresses an image File via canvas to max 1200px wide, JPEG quality 0.7.
 * Returns a base64 data URL.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        let { width, height } = img;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
