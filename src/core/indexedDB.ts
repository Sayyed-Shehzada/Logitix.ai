import { Conversation } from '../types.js';

const DB_NAME = 'LogitixOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = (event) => {
      console.warn('IndexedDB opening error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Cache all conversations into IndexedDB for offline persistence and high durability
 */
export async function saveConversationsToIDB(conversations: Conversation[]): Promise<boolean> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear stale or deleted conversations so IndexedDB stays exactly in sync
    store.clear();

    // Save each remaining conversation into IndexedDB
    for (const conv of conversations) {
      store.put(conv);
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        console.warn('IndexedDB save transaction error:', err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Failed to save conversations to IndexedDB:', err);
    return false;
  }
}

/**
 * Load conversations stored in IndexedDB for offline recovery, optionally filtered by email
 */
export async function loadConversationsFromIDB(email?: string): Promise<Conversation[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = (request.result || []) as Conversation[];
        if (email) {
          const cleanEmail = email.toLowerCase().trim();
          const filtered = result.filter(
            (c) => !c.userEmail || c.userEmail.toLowerCase().trim() === cleanEmail
          );
          resolve(filtered);
        } else {
          resolve(result);
        }
      };

      request.onerror = () => {
        console.warn('Error reading from IndexedDB store');
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Failed to load conversations from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a specific conversation from IndexedDB cache
 */
export async function deleteConversationFromIDB(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to delete conversation from IndexedDB:', err);
    return false;
  }
}
