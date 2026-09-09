import type { AttachmentSearchParams } from '@/modules/base/user-center/api/attachment'

export const storageOptions = [
  { label: '本地', value: '1' }, { label: '阿里云', value: '2' },
  { label: '七牛云', value: '3' }, { label: '腾讯云', value: '4' },
]

export function storageLabel(value: unknown) {
  const aliases: Record<string, string> = { local: '本地', oss: '阿里云', qiniu: '七牛云', cos: '腾讯云' }
  const key = String(value ?? '')
  return storageOptions.find(option => option.value === key)?.label ?? aliases[key] ?? (key ? `未知（${key}）` : '未记录')
}

export function formatFileSize(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '未知'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = value === 0 ? 0 : Math.max(0, Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1))
  return `${Number((value / 1024 ** index).toFixed(index === 0 ? 0 : 2))} ${units[index]}`
}

export function attachmentUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const url = value.trim()
  if ([...url].some(character => character.charCodeAt(0) <= 32 || character === '\\')) return null
  // Use only the URL returned by the API; never derive a public path from storage metadata.
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      return parsed.username || parsed.password ? null : url
    } catch { return null }
  }
  return url.startsWith('/') && !url.startsWith('//') ? url : null
}

export function attachmentError(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    if ('code' in error && Number(error.code) === 401) return '登录已过期，请重新登录'
    if ('code' in error && Number(error.code) === 403) return '暂无操作权限，请联系管理员'
    if ('code' in error && Number(error.code) === 413) return '文件超过服务器上传限制，请选择更小的文件'
    if ('message' in error && typeof error.message === 'string' && error.message.trim()) return error.message
  }
  return fallback
}

export function attachmentSearch(params: Record<string, unknown>): AttachmentSearchParams {
  const text = (value: unknown) => typeof value === 'string' ? value.trim() || undefined : undefined
  const start = text(params.start_date)
  const end = text(params.end_date)
  let createdAt: [string, string] | undefined
  if (start || end) {
    if (!start || !end) throw new Error('请选择完整的上传日期范围')
    if (![start, end].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)) throw new Error('请选择有效的上传日期')
    if (start > end) throw new Error('开始日期不能晚于结束日期')
    createdAt = [`${start} 00:00:00`, `${end} 23:59:59`]
  }
  const mode = Number(params.storage_mode)
  return {
    page: Number(params.page ?? 1), page_size: Number(params.page_size ?? 20),
    origin_name: text(params.origin_name),
    suffix: text(params.suffix)?.split(/[,，]/).map(value => value.trim().replace(/^\./, '').toLowerCase()).filter(Boolean).join(',') || undefined,
    storage_mode: [1, 2, 3, 4].includes(mode) ? mode : undefined,
    created_at: createdAt,
  }
}
