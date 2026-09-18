/** Minimal persistence port. Session services do not require a DOM Storage implementation. */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
