import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ToastContext } from '@/components/reui/toast-context'
import type { MaDownloadProps } from '../types'
import { downloadFile } from '../utils/download-file'

/** 管理单次下载生命周期；请求与鉴权通过调用方注入。 */
export function useDownload(props: MaDownloadProps) {
  const context = useContext(ToastContext)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  }, [props])
  useEffect(
    () => () => {
      const controller = active.current
      active.current = null
      if (controller) {
        controller.abort()
        setDownloading(false)
        latest.current.onDownloadingChange?.(false)
      }
    },
    [],
  )

  async function download() {
    if (props.disabled || active.current) return
    const controller = new AbortController()
    active.current = controller
    setDownloading(true)
    setError('')
    let failure: Error | undefined
    let triggered = false
    try {
      props.onDownloadingChange?.(true)
      const source = props.request
        ? { request: props.request }
        : props.blob
          ? { blob: props.blob }
          : { url: props.url ?? '' }
      await downloadFile({ ...source, filename: props.filename, signal: controller.signal }, context?.toast)
      if (!controller.signal.aborted && active.current === controller) triggered = true
    } catch (reason) {
      if (
        !controller.signal.aborted &&
        active.current === controller &&
        !(reason instanceof DOMException && reason.name === 'AbortError')
      ) {
        failure = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : '下载失败，请重试')
        setError(failure.message || '下载失败，请重试')
      }
    } finally {
      if (active.current === controller) {
        active.current = null
        setDownloading(false)
        latest.current.onDownloadingChange?.(false)
      }
    }
    if (failure) latest.current.onError?.(failure)
    if (triggered) latest.current.onSuccess?.()
  }

  return { downloading, error, download }
}
