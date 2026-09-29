export interface TableRequestSnapshot {
  response?: unknown
  error?: unknown
  loading: boolean
  active: boolean
}
/** Structural query contract; the component has no dependency on a cache implementation. */
export interface TableResourceQuery {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>
}
export interface TableRequestStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TableRequestSnapshot
  request: (
    key: string,
    params: Record<string, unknown>,
    load: (signal: AbortSignal) => Promise<unknown>,
    signal: AbortSignal,
    resourceQuery?: TableResourceQuery,
  ) => Promise<unknown>
}
