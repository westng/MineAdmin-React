import { createElement } from 'react'
import type { ToastApi } from '@/components/reui/use-toast'
import { DownloadProgress } from '../components/download-progress'
import type { MaDownloadProgress } from '../types'

export function createDownloadNotification(toast: ToastApi | undefined, name: string, cancel?: () => void) {
  const id = `download-${crypto.randomUUID()}`
  let currentName = name
  let lastUpdate = 0
  let settled = false
  const options = {
    id,
    duration: Infinity,
    dismissible: false,
    closeButton: false,
    action: cancel ? { label: '取消', onClick: cancel } : undefined,
    classNames: { content: 'min-w-0 flex-1', description: 'w-full' },
  }
  toast?.loading('正在准备下载', { ...options, description: createElement(DownloadProgress, { name }) })
  return {
    rename(value: string) {
      currentName = value
    },
    progress(progress: MaDownloadProgress) {
      if (settled || Date.now() - lastUpdate < 100) return
      lastUpdate = Date.now()
      toast?.loading('正在下载', {
        ...options,
        description: createElement(DownloadProgress, { name: currentName, progress }),
      })
    },
    complete() {
      if (settled) return
      settled = true
      toast?.success('下载完成', {
        id,
        description: `${currentName} · 已交给浏览器保存`,
        duration: 3500,
        dismissible: true,
        closeButton: true,
        action: undefined,
      })
    },
    error(error: Error) {
      if (settled) return
      settled = true
      toast?.error('下载失败', {
        id,
        description: `${currentName} · ${error.message}`,
        duration: 6000,
        dismissible: true,
        closeButton: true,
        action: undefined,
      })
    },
    cancel() {
      if (settled) return
      settled = true
      toast?.info('已取消下载', {
        id,
        description: currentName,
        duration: 3500,
        dismissible: true,
        closeButton: true,
        action: undefined,
      })
    },
  }
}
