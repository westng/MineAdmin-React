export function runLifecycle<T>(
  operation: () => Promise<T> | T,
  { signal, timeoutMs = 10_000 }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException('Operation cancelled', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      reject(new DOMException('Operation cancelled', 'AbortError'))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Extension operation timed out'))
    }, timeoutMs)
    signal?.addEventListener('abort', abort, { once: true })
    Promise.resolve()
      .then(operation)
      .then(
        value => {
          cleanup()
          resolve(value)
        },
        error => {
          cleanup()
          reject(error)
        },
      )
  })
}
