/** Minimal persistence port. Session services do not require a DOM Storage implementation. */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  subscribe?: (listener: (key: string | null) => void) => () => void
}

export function createBrowserStorage(
  storage: Storage,
  events: Pick<Window, 'addEventListener' | 'removeEventListener'>,
): StorageAdapter {
  return {
    getItem: key => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: key => storage.removeItem(key),
    subscribe(listener) {
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea === storage || event.storageArea === null) listener(event.key)
      }
      events.addEventListener('storage', onStorage)
      return () => events.removeEventListener('storage', onStorage)
    },
  }
}
