export type Disposer = () => void
export interface Registration {
  id: string
  order?: number
}
/** Stable snapshots and ownership-aware disposal for typed extension collections. */
export function createRegistry<T extends Registration>() {
  const values = new Map<string, T>()
  const listeners = new Set<() => void>()
  let snapshot: readonly T[] = []
  function publish() {
    snapshot = [...values.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): Disposer {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    register(value: T): Disposer {
      if (!value.id.trim() || values.has(value.id)) throw new Error(`Duplicate or empty registration: ${value.id}`)
      if (value.order !== undefined && !Number.isFinite(value.order))
        throw new Error(`Invalid registration order: ${value.id}`)
      const registered = Object.freeze({ ...value }) as T
      values.set(value.id, registered)
      publish()
      return () => {
        if (values.get(value.id) === registered) {
          values.delete(value.id)
          publish()
        }
      }
    },
  }
}
