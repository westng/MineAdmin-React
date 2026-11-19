import type { MaDownloadRequestOptions, MaDownloadResult } from '../types'

export function safeFilename(filename: string) {
  const name = filename.replace(/\p{Cc}|[/\\]/gu, '_').trim()
  return name && name !== '.' && name !== '..' ? name : 'download'
}

function clickDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener noreferrer'
  anchor.referrerPolicy = 'no-referrer'
  anchor.hidden = true
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
  }
}

export function downloadAddress(value: string) {
  if (!value.trim()) throw new Error('下载地址不能为空')
  const url = new URL(value, document.baseURI)
  if (!['http:', 'https:', 'blob:'].includes(url.protocol) || url.username || url.password)
    throw new Error('不支持的下载地址协议')
  return url
}

export function downloadFilename(value: string) {
  const url = downloadAddress(value)
  let name = url.pathname.split('/').pop() || 'download'
  try {
    name = decodeURIComponent(name)
  } catch {
    // 非标准编码的路径保留原文件名。
  }
  return safeFilename(name)
}

export async function downloadUrl(value: string, filename: string | undefined, options: MaDownloadRequestOptions) {
  const url = downloadAddress(value)
  const response = await fetch(url.href, {
    signal: options.signal,
    credentials: 'same-origin',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error(`下载失败（HTTP ${response.status}）`)
  const length = Number(response.headers.get('content-length'))
  const total =
    Number.isSafeInteger(length) && length > 0 && !response.headers.get('content-encoding') ? length : undefined
  let loaded = 0
  options.onProgress({ loaded, total })
  const reader = response.body?.getReader()
  let blob: Blob
  if (reader) {
    const chunks: ArrayBuffer[] = []
    try {
      for (;;) {
        options.signal.throwIfAborted()
        const { value: chunk, done } = await reader.read()
        options.signal.throwIfAborted()
        if (done) break
        chunks.push(new Uint8Array(chunk).buffer)
        loaded += chunk.byteLength
        options.onProgress({ loaded, total: total && loaded <= total ? total : undefined })
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined)
      throw error
    } finally {
      reader.releaseLock()
    }
    if (total !== undefined && loaded !== total) throw new Error('下载内容不完整，请重试')
    blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' })
  } else {
    blob = await response.blob()
    options.signal.throwIfAborted()
    options.onProgress({ loaded: blob.size, total: blob.size })
  }
  options.signal.throwIfAborted()
  downloadBlob(blob, filename ?? downloadFilename(value))
  return blob.size
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
