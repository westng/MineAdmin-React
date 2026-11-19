import type { ToastApi } from '@/components/reui/use-toast'
import type { MaDownloadTask } from '../types'
import { createDownloadNotification } from './download-notification'
import { downloadBlob, downloadError, downloadFilename, downloadUrl, safeFilename } from './download-utils'

export async function downloadFile(task: MaDownloadTask, toast?: ToastApi) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (task.signal?.aborted) controller.abort()
  task.signal?.addEventListener('abort', abort, { once: true })
  const name = safeFilename(task.filename || (task.blob instanceof File ? task.blob.name : '文件'))
  const notice = createDownloadNotification(toast, name, abort)
  const onAbort = () => notice.cancel()
  controller.signal.addEventListener('abort', onAbort, { once: true })
  const onProgress = (progress: Parameters<NonNullable<MaDownloadTask['onProgress']>>[0]) => {
    if (controller.signal.aborted) return
    task.onProgress?.(progress)
    notice.progress(progress)
  }
  const options = { signal: controller.signal, onProgress }
  try {
    controller.signal.throwIfAborted()
    const result = task.request ? await task.request(options) : (task.blob ?? { url: task.url ?? '' })
    controller.signal.throwIfAborted()
    if (result && !(result instanceof Blob) && typeof result === 'object' && 'url' in result) {
      const filename = task.filename ?? result.filename ?? downloadFilename(result.url)
      notice.rename(safeFilename(filename))
      await downloadUrl(result.url, filename, options)
    } else {
      downloadBlob(result, task.filename)
      const blob = result instanceof Blob ? result : result.blob
      notice.rename(
        safeFilename(
          task.filename ??
            (result instanceof Blob ? undefined : result.filename) ??
            (blob instanceof File ? blob.name : 'download'),
        ),
      )
      onProgress({ loaded: blob.size, total: blob.size })
    }
    notice.complete()
  } catch (reason) {
    if (controller.signal.aborted) notice.cancel()
    else notice.error(downloadError(reason))
    throw reason
  } finally {
    task.signal?.removeEventListener('abort', abort)
    controller.signal.removeEventListener('abort', onAbort)
  }
}
