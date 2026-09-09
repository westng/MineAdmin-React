import type { LoginLogParams, OperationLogParams } from '../api/log'

function searchText(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function timeRange(params: Record<string, unknown>): [string, string] | undefined {
  const start = searchText(params.start_time)
  const end = searchText(params.end_time)
  if (!start && !end) return undefined
  if (!start || !end) throw new Error('请选择完整的开始时间和结束时间')
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
  if (!pattern.test(start) || !pattern.test(end) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) {
    throw new Error('请选择有效的时间范围')
  }
  if (Date.parse(start) > Date.parse(end)) throw new Error('开始时间不能晚于结束时间')
  const toServerTime = (value: string) => `${value.replace('T', ' ')}${value.length === 16 ? ':00' : ''}`
  return [toServerTime(start), toServerTime(end)]
}

function commonParams(params: Record<string, unknown>) {
  return {
    page: Number(params.page ?? 1),
    page_size: Number(params.page_size ?? 20),
    username: searchText(params.username),
    ip: searchText(params.ip),
  }
}

export function toLoginLogParams(params: Record<string, unknown>): LoginLogParams {
  const status = Number(params.status)
  return {
    ...commonParams(params),
    os: searchText(params.os),
    browser: searchText(params.browser),
    status: status === 1 || status === 2 ? status : undefined,
    login_time: timeRange(params),
  }
}

export function toOperationLogParams(params: Record<string, unknown>): OperationLogParams {
  return {
    ...commonParams(params),
    method: searchText(params.method),
    router: searchText(params.router),
    service_name: searchText(params.service_name),
    created_at: timeRange(params),
  }
}

export function logErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'code' in error && Number(error.code) === 401) return '登录已过期，请重新登录'
  if (error && typeof error === 'object' && 'code' in error && Number(error.code) === 403) return '暂无操作权限，请联系管理员'
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) return error.message
  return fallback
}
