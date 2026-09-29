import type { ComponentProps, ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { buttonVariants } from '@/components/reui/primitives/button'

/** 请求适配层负责校验响应并解析服务端文件名。 */
export interface MaDownloadResult {
  blob: Blob
  filename?: string
}

export type MaDownloadRequest = (options: { signal: AbortSignal }) => Promise<Blob | MaDownloadResult>

export type MaDownloadSource =
  | { url: string; blob?: never; request?: never }
  | { blob: Blob; url?: never; request?: never }
  | { request: MaDownloadRequest; url?: never; blob?: never }

export interface MaDownloadBaseProps
  extends Omit<ComponentProps<'button'>, 'onError' | 'type'>, VariantProps<typeof buttonVariants> {
  filename?: string
  icon?: ReactNode
  loadingText?: ReactNode
  wrapperClassName?: string
  onDownloadingChange?: (downloading: boolean) => void
  /** 表示已触发浏览器下载，不代表文件已保存到磁盘。 */
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export type MaDownloadProps = MaDownloadBaseProps & MaDownloadSource
