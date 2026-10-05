import { isValid, parse } from 'date-fns'
import { createTextTranslator } from '@/services/i18n/translator'
import type { LoginLogParams, OperationLogParams } from '../../api/log'
import type { AppRuntime } from '@/provider/runtime/types'
export function createViewData(runtime: Pick<AppRuntime, 'i18n' | 'locales'>) {
  const tx = createTextTranslator(runtime, 'base.permission.log.ui')
  function searchText(value: unknown) {
    return typeof value === 'string' ? value.trim() || undefined : undefined
  }
  function timeRange(value: unknown): [string, string] | undefined {
    if (value == null) return undefined
    if (!Array.isArray(value)) throw new Error(tx('请选择有效的时间范围'))
    const start = searchText(value[0])
    const end = searchText(value[1])
    if (!start && !end) return undefined
    if (!start || !end) throw new Error(tx('请选择完整的开始时间和结束时间'))
    const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
    const startDate = parse(start, 'yyyy-MM-dd HH:mm:ss', new Date())
    const endDate = parse(end, 'yyyy-MM-dd HH:mm:ss', new Date())
    if (!pattern.test(start) || !pattern.test(end) || !isValid(startDate) || !isValid(endDate)) {
      throw new Error(tx('请选择有效的时间范围'))
    }
    if (startDate > endDate) throw new Error(tx('开始时间不能晚于结束时间'))
    return [start, end]
  }
  function commonParams(params: Record<string, unknown>) {
    return {
      page: Number(params.page ?? 1),
      page_size: Number(params.page_size ?? 20),
      username: searchText(params.username),
      ip: searchText(params.ip),
    }
  }
  function toLoginLogParams(params: Record<string, unknown>): LoginLogParams {
    const status = Number(params.status)
    return {
      ...commonParams(params),
      os: searchText(params.os),
      browser: searchText(params.browser),
      status: status === 1 || status === 2 ? status : undefined,
      login_time: timeRange(params.login_time),
    }
  }
  function toOperationLogParams(params: Record<string, unknown>): OperationLogParams {
    return {
      ...commonParams(params),
      method: searchText(params.method),
      router: searchText(params.router),
      service_name: searchText(params.service_name),
      created_at: timeRange(params.created_at),
    }
  }
  function logErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object' && 'code' in error && Number(error.code) === 401)
      return tx('登录已过期，请重新登录')
    if (error && typeof error === 'object' && 'code' in error && Number(error.code) === 403)
      return tx('暂无操作权限，请联系管理员')
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.trim()
    )
      return error.message
    return fallback
  }
  return { toLoginLogParams, toOperationLogParams, logErrorMessage }
}
