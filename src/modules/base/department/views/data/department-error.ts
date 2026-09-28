import { createTextTranslator } from '@/services/i18n/translator'
import type { AppRuntime } from '@/provider/runtime/types'
export function createViewData(runtime: Pick<AppRuntime, 'i18n' | 'locales'>) {
  const tx = createTextTranslator(runtime, 'base.permission.department.ui')
  function departmentErrorMessage(error: unknown, fallback: string) {
    if (error && typeof error === 'object') {
      if ('code' in error && Number(error.code) === 401) return tx('登录已过期，请重新登录')
      if ('code' in error && Number(error.code) === 403) return tx('暂无操作权限，请联系管理员')
      if ('message' in error && typeof error.message === 'string' && error.message.trim()) return error.message
    }
    return fallback
  }
  return { departmentErrorMessage }
}
