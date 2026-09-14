/* ==========================================================================
   AA机 - 大容量无损存储核心引擎 (IndexedDB Storage Engine)
   彻底解决 localStorage 5MB 限制与爆黑屏问题，支持几百MB/GB级无损原图 Blob 存储
   ========================================================================== */

const DB_NAME = 'AA_PHONE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'aa_storage';

class AAStorage {
  constructor() {
    this.dbPromise = this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e) => {
        resolve(e.target.result);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open failed:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async get(key) {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error getting key "${key}":`, err);
      return null;
    }
  }

  async set(key, value) {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error setting key "${key}":`, err);
      return false;
    }
  }

  async delete(key) {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Error deleting key "${key}":`, err);
      return false;
    }
  }
}

export const db = new AAStorage();
