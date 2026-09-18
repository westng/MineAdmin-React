import { createTextTranslator } from '@/provider/i18n'

const tx = createTextTranslator('base.permission.department.ui')

export function departmentErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    if ('code' in error && Number(error.code) === 401) return tx('登录已过期，请重新登录')
    if ('code' in error && Number(error.code) === 403) return tx('暂无操作权限，请联系管理员')
    if ('message' in error && typeof error.message === 'string' && error.message.trim()) return error.message
  }
  return fallback
}
