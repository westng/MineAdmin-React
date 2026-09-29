import type { UploadValidationOptions } from '../types/internal'

export function normalizeUploadValue(value: string | string[] | null | undefined): string[] {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(url => typeof url === 'string' && url !== '')
}

export function uploadFileName(url: string) {
  const name = url.split(/[?#]/)[0].split('/').pop() || '文件'
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

export function formatUploadSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`
  if (bytes >= 1024) return `${Math.round((bytes / 1024) * 10) / 10}KB`
  return `${bytes}B`
}

/** Pure preflight validation: no state, requests or UI. */
export function validateUploadFiles(files: File[], options: UploadValidationOptions): string | undefined {
  const { multiple, currentCount, maxCount, accept, maxSize } = options
  if (!multiple && files.length > 1) return '只能上传一个文件'
  if ((multiple ? currentCount + files.length : files.length) > maxCount) return `最多上传 ${maxCount} 个文件`
  const allowed = accept
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
  for (const file of files) {
    const matches =
      allowed.length === 0 ||
      allowed.some(
        type =>
          type === '*' ||
          type === '*/*' ||
          (type.startsWith('.')
            ? file.name.toLowerCase().endsWith(type)
            : type.endsWith('/*')
              ? file.type.toLowerCase().startsWith(type.slice(0, -1))
              : file.type.toLowerCase() === type),
      )
    if (!matches) return `${file.name}：请选择允许的文件类型`
    if (file.size > maxSize) return `请选择不超过 ${formatUploadSize(maxSize)} 的文件：${file.name}`
  }
}

export function readUploadedUrl(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('上传成功，但未返回文件地址')
  if (value.length > maxLength) throw new Error(`文件地址不能超过 ${maxLength} 个字符`)
  return value
}

export function uploadErrorMessage(reason: unknown): string {
  return reason && typeof reason === 'object' && 'message' in reason ? String(reason.message) : '文件上传失败，请重试'
}
