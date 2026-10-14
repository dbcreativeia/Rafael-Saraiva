import { CausaAnimalDatasetV2, ValidationReceipt } from './causaAnimalValidator';

const DB_NAME = 'CausaAnimalElectoralDB';
const DB_VERSION = 1;
const STORE_NAME = 'dataset_v2';
const RECEIPT_STORE = 'receipt_v2';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error("IndexedDB não suportado neste navegador."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(RECEIPT_STORE)) {
        db.createObjectStore(RECEIPT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCausaAnimalLocally(data: CausaAnimalDatasetV2, receipt: ValidationReceipt): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, RECEIPT_STORE], 'readwrite');
      tx.objectStore(STORE_NAME).put(data, 'current_dataset');
      tx.objectStore(RECEIPT_STORE).put(receipt, 'current_receipt');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Falha ao salvar no IndexedDB:", e);
    return false;
  }
}

export async function loadCausaAnimalLocally(): Promise<{ data: CausaAnimalDatasetV2 | null; receipt: ValidationReceipt | null }> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME, RECEIPT_STORE], 'readonly');
      const reqData = tx.objectStore(STORE_NAME).get('current_dataset');
      const reqReceipt = tx.objectStore(RECEIPT_STORE).get('current_receipt');
      
      let dataResult: CausaAnimalDatasetV2 | null = null;
      let receiptResult: ValidationReceipt | null = null;

      reqData.onsuccess = () => { dataResult = reqData.result || null; };
      reqReceipt.onsuccess = () => { receiptResult = reqReceipt.result || null; };

      tx.oncomplete = () => {
        resolve({ data: dataResult, receipt: receiptResult });
      };
      tx.onerror = () => {
        resolve({ data: null, receipt: null });
      };
    });
  } catch (e) {
    console.warn("Falha ao carregar do IndexedDB:", e);
    return { data: null, receipt: null };
  }
}

export async function clearCausaAnimalLocally(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME, RECEIPT_STORE], 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore(RECEIPT_STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
