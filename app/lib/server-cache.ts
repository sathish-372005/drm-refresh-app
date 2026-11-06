import "server-only";

type Entry = { value?: unknown; expires: number; pending?: Promise<unknown> };
const store = new Map<string, Entry>();

export const cached = async <T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> => {
  const hit = store.get(key);
  if (hit?.value !== undefined && hit.expires > Date.now()) return hit.value as T;
  if (hit?.pending) return hit.pending as Promise<T>;

  const pending = load()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((error) => {
      store.delete(key); // never cache failures
      throw error;
    });
  store.set(key, { expires: 0, pending });
  return pending;
};

export const serverCache = {
  getOrSet: <T>(key: string, load: () => Promise<T>, ttlMs = 5 * 60_000) => cached(key, ttlMs, load),
  clear: (key?: string) => {
    if (key) store.delete(key);
    else store.clear();
  },
};

