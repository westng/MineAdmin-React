export type AppErrorCode = 'network' | 'unauthorized' | 'forbidden' | 'validation' | 'conflict' | 'plugin' | 'unknown'
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly module = 'app',
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
export function normalizeError(error: unknown, module = 'app'): AppError {
  if (error instanceof AppError) return error
  const status = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : undefined
  const code =
    status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status && status >= 500 ? 'network' : 'unknown'
  // Raw response payloads and URLs can carry credentials. They are never telemetry fields.
  return new AppError(
    code,
    code === 'unknown' ? '操作失败，请重试' : '请求未能完成',
    module,
    Number.isFinite(status) ? status : undefined,
  )
}
