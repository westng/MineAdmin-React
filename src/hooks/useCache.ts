export interface CacheOptions {
  exp?: number
}

export interface CacheStore {
  set: <T>(key: string, value: T, options?: CacheOptions) => void
  get: <T>(key: string, fallback?: T) => T
  remove: (key: string) => void
  clear: () => void
}

type CacheEntry<T> = { value: T; expiresAt?: number }

const prefix = import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_'

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function keyFor(key: string) {
  return `${prefix}${key}`
}

export function createCache(): CacheStore {
  return {
    set: <T>(key: string, value: T, options?: CacheOptions) => {
      if (!storageAvailable()) return
      const entry: CacheEntry<unknown> = {
        value,
        expiresAt: options?.exp ? Date.now() + options.exp * 1000 : undefined,
      }
      localStorage.setItem(keyFor(key), JSON.stringify(entry))
    },
    get: <T>(key: string, fallback?: T) => {
      if (!storageAvailable()) return fallback as T
      const raw = localStorage.getItem(keyFor(key))
      if (!raw) return fallback as T
      try {
        const entry = JSON.parse(raw) as CacheEntry<T>
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
          localStorage.removeItem(keyFor(key))
          return fallback as T
        }
        return entry.value
      }
      catch {
        localStorage.removeItem(keyFor(key))
        return fallback as T
      }
    },
    remove: key => {
      if (storageAvailable()) localStorage.removeItem(keyFor(key))
    },
    clear: () => {
      if (!storageAvailable()) return
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix))
      keys.forEach(key => localStorage.removeItem(key))
    },
  }
}

const cache = createCache()
export default cache
