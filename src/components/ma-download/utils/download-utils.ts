import type { MaDownloadResult } from '../types'

function safeFilename(filename: string) {
  const name = filename.replace(/\p{Cc}|[/\\]/gu, '_').trim()
  return name && name !== '.' && name !== '..' ? name : 'download'
}

function clickDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener noreferrer'
  anchor.hidden = true
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
  }
}

export function downloadUrl(value: string, filename?: string) {
  if (!value.trim()) throw new Error('下载地址不能为空')
  const url = new URL(value, document.baseURI)
  if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('不支持的下载地址协议')
  let name = url.pathname.split('/').pop() || 'download'
  try {
    name = decodeURIComponent(name)
  } catch {
    // 非标准编码的路径保留原文件名。
  }
  clickDownload(url.href, safeFilename(filename ?? name))
}

export function downloadBlob(result: Blob | MaDownloadResult, filename?: string) {
  const blob = result instanceof Blob ? result : result?.blob
  if (!(blob instanceof Blob)) throw new Error('下载请求必须返回 Blob 或包含 blob 的结果')
  const resultName = result instanceof Blob ? undefined : result.filename
  const fileName = 'name' in blob && typeof blob.name === 'string' ? blob.name : undefined
  const name = safeFilename(filename ?? resultName ?? fileName ?? 'download')
  const url = URL.createObjectURL(blob)
  try {
    clickDownload(url, name)
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  // 留出浏览器接管下载的时间；组件卸载不应提前撤销已触发的下载。
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : '下载失败，请重试')
}
