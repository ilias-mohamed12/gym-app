// Tiny IndexedDB wrapper. All data stays on the device.
const DB = (() => {
  const NAME = 'fitbox', VERSION = 3;
  const STORES = {
    kv: { keyPath: 'key' },
    entries: { keyPath: 'id', index: ['date'] },
    meals: { keyPath: 'id' },
    plans: { keyPath: 'id' },
    workouts: { keyPath: 'id', index: ['date'] },
    folders: { keyPath: 'id' },
    videos: { keyPath: 'id', index: ['folderId'] },
    weights: { keyPath: 'date' }, // Körpergewicht: ein Eintrag pro Tag
    blobs: { keyPath: 'id' },     // Videodaten (getrennt von den Video-Infos)
  };
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name, cfg] of Object.entries(STORES)) {
          if (db.objectStoreNames.contains(name)) continue;
          const st = db.createObjectStore(name, { keyPath: cfg.keyPath });
          for (const ix of cfg.index || []) st.createIndex(ix, ix);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const st = t.objectStore(store);
      let result;
      Promise.resolve(fn(st)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

  return {
    all: (store) => tx(store, 'readonly', (st) => wrap(st.getAll())),
    get: (store, id) => tx(store, 'readonly', (st) => wrap(st.get(id))),
    put: (store, obj) => tx(store, 'readwrite', (st) => wrap(st.put(obj))),
    del: (store, id) => tx(store, 'readwrite', (st) => wrap(st.delete(id))),
    clear: (store) => tx(store, 'readwrite', (st) => wrap(st.clear())),
    by: (store, index, value) => tx(store, 'readonly', (st) => wrap(st.index(index).getAll(value))),
    keys: (store) => tx(store, 'readonly', (st) => wrap(st.getAllKeys())),
    keysBy: (store, index, value) => tx(store, 'readonly', (st) => wrap(st.index(index).getAllKeys(value))),
    stores: Object.keys(STORES),
  };
})();
