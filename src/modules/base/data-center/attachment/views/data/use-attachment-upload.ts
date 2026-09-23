import { createTextTranslator } from '@/provider/i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/reui/use-toast'
import { useFileUpload } from '@/hooks/framework/use-file-upload'
import { hasAuth } from '@/hooks/framework/use-permission'
import { upload } from '@/modules/base/user-center/api/attachment'
import { attachmentError } from './attachment'

const tx = createTextTranslator('base.data-center.attachment.ui')

type UploadStatus = { status: 'queued' | 'uploading' | 'success' | 'error'; progress: number | null; error?: string }
const queuedStatus: UploadStatus = { status: 'queued', progress: null }

export function useAttachmentUpload(onUploaded: () => void) {
  const { toast } = useToast()
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({})
  const [pending, setPending] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const [selection, fileActions] = useFileUpload({
    multiple: true,
    onError: () => toast(tx('文件无法加入队列，请重新选择'), 'destructive'),
  })
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])
  const items = selection.files.map(item => ({ ...item, ...(statuses[item.id] ?? queuedStatus) }))

  const removeFile = (id: string) => {
    if (controllerRef.current) return
    fileActions.removeFile(id)
    setStatuses(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const startUpload = useCallback(
    async (id?: string) => {
      if (controllerRef.current) return
      if (!hasAuth('dataCenter:attachment:upload')) {
        toast(tx('暂无上传权限，请联系管理员'), 'destructive')
        return
      }
      const queued = selection.files.filter(
        item => (!statuses[item.id] || statuses[item.id].status === 'error') && (!id || item.id === id),
      )
      if (!queued.length) return
      const controller = new AbortController()
      controllerRef.current = controller
      setPending(true)
      let successCount = 0
      let failedCount = 0
      const update = (id: string, change: Partial<UploadStatus>) => {
        if (!controller.signal.aborted)
          setStatuses(current => ({ ...current, [id]: { ...(current[id] ?? queuedStatus), ...change } }))
      }
      try {
        for (const item of queued) {
          if (controller.signal.aborted) break
          if (!hasAuth('dataCenter:attachment:upload')) {
            toast(tx('上传权限已失效，请联系管理员'), 'destructive')
            break
          }
          update(item.id, { status: 'uploading', progress: null, error: undefined })
          try {
            if (!(item.file instanceof File)) throw new Error(tx('文件不可用，请重新选择'))
            const response = await upload(item.file, {
              timeout: 120_000,
              signal: controller.signal,
              onUploadProgress: event =>
                update(item.id, {
                  progress: event.total ? Math.min(100, Math.round((event.loaded / event.total) * 100)) : null,
                }),
            })
            if (response.data.code !== 200) throw new Error(response.data.message || tx('上传失败'))
            if (!response.data.data?.id) throw new Error(tx('上传响应缺少附件记录，请刷新列表确认后再重试'))
            update(item.id, { status: 'success', progress: 100 })
            successCount += 1
          } catch (error) {
            if (controller.signal.aborted) break
            update(item.id, { status: 'error', error: attachmentError(error, tx('上传失败，请重试')) })
            failedCount += 1
            if (error && typeof error === 'object' && 'code' in error && [401, 403].includes(Number(error.code))) break
          }
        }
        if (!controller.signal.aborted) {
          if (successCount) onUploaded()
          if (successCount || failedCount)
            toast(
              tx('上传成功 {0} 个{1}', { '0': successCount, '1': failedCount ? `，失败 ${failedCount} 个` : '' }),
              failedCount ? 'destructive' : 'success',
            )
        }
      } finally {
        controllerRef.current = null
        if (!controller.signal.aborted) setPending(false)
      }
    },
    [selection.files, statuses, onUploaded, toast],
  )

  return { items, pending, isDragging: selection.isDragging, fileActions, removeFile, startUpload }
}
