import type { StorageAdapter } from './index'
export interface CacheOptions {
  exp?: number
}

export interface CacheStore {
  set: <T>(key: string, value: T, options?: CacheOptions) => void
  get: <T>(key: string, fallback?: T) => T
  remove: (key: string) => void
}

type CacheEntry<T> = { value: T; expiresAt?: number }

export function createCache(storage: StorageAdapter, prefix: string): CacheStore {
  const keyFor = (key: string) => `${prefix}cache:${key}`
  return {
    set: <T>(key: string, value: T, options?: CacheOptions) => {
      const entry: CacheEntry<unknown> = {
        value,
        expiresAt: options?.exp ? Date.now() + options.exp * 1000 : undefined,
      }
      storage.setItem(keyFor(key), JSON.stringify(entry))
    },
    get: <T>(key: string, fallback?: T) => {
      const raw = storage.getItem(keyFor(key))
      if (!raw) return fallback as T
      try {
        const entry = JSON.parse(raw) as CacheEntry<T>
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
          storage.removeItem(keyFor(key))
          return fallback as T
        }
        return entry.value
      } catch {
        storage.removeItem(keyFor(key))
        return fallback as T
      }
    },
    remove: key => {
      storage.removeItem(keyFor(key))
    },
  }
}
