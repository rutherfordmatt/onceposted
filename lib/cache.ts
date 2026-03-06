interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

interface BufferCacheEntry {
  buffer: Buffer;
  contentType: string;
  accessedAt: number;
}

class BufferCache {
  private store = new Map<string, BufferCacheEntry>();
  private maxEntries: number;

  constructor(maxEntries: number = 50) {
    this.maxEntries = maxEntries;
  }

  get(key: string): { buffer: Buffer; contentType: string } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    entry.accessedAt = Date.now();
    return { buffer: entry.buffer, contentType: entry.contentType };
  }

  invalidate(key: string): void {
    for (const [k] of this.store.entries()) {
      if (k.includes(key.replace(/^\/api\/images\//, ""))) {
        this.store.delete(k);
      }
    }
  }

  set(key: string, buffer: Buffer, contentType: string): void {
    if (this.store.size >= this.maxEntries) {
      let oldestKey = "";
      let oldestTime = Infinity;
      for (const [k, v] of this.store.entries()) {
        if (v.accessedAt < oldestTime) {
          oldestTime = v.accessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { buffer, contentType, accessedAt: Date.now() });
  }
}

export const dataCache = new MemoryCache();
export const thumbnailCache = new BufferCache(50);
