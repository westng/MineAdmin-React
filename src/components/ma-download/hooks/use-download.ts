import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MaDownloadProps } from '../types'
import { downloadBlob, downloadError, downloadUrl } from '../utils/download-utils'

/** 管理单次下载生命周期；请求与鉴权通过调用方注入。 */
export function useDownload(props: MaDownloadProps) {
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
      if (props.request) {
        const result = await props.request({ signal: controller.signal })
        if (controller.signal.aborted || active.current !== controller) return
        downloadBlob(result, props.filename)
      } else if (props.blob) {
        downloadBlob(props.blob, props.filename)
      } else {
        downloadUrl(props.url ?? '', props.filename)
      }
      triggered = true
    } catch (reason) {
      if (!controller.signal.aborted && active.current === controller) {
        failure = downloadError(reason)
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
