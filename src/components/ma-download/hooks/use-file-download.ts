import { useCallback, useContext, useEffect, useRef } from 'react'
import { ToastContext } from '@/components/reui/toast-context'
import type { MaDownloadTask } from '../types'
import { downloadFile } from '../utils/download-file'

export function useFileDownload() {
  const context = useContext(ToastContext)
  const active = useRef(new Set<AbortController>())
  useEffect(() => {
    const controllers = active.current
    return () => {
      controllers.forEach(controller => controller.abort())
      controllers.clear()
    }
  }, [])
  return useCallback(
    async (task: MaDownloadTask) => {
      const controller = new AbortController()
      const abort = () => controller.abort()
      if (task.signal?.aborted) controller.abort()
      task.signal?.addEventListener('abort', abort, { once: true })
      active.current.add(controller)
      try {
        await downloadFile({ ...task, signal: controller.signal }, context?.toast)
        return true
      } catch {
        return false
      } finally {
        active.current.delete(controller)
        task.signal?.removeEventListener('abort', abort)
      }
    },
    [context],
  )
}
