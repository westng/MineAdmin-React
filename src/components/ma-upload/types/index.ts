import type { AriaAttributes } from 'react'

export type MaUploadRequest = (file: File, options: { signal: AbortSignal }) => Promise<string>

export interface MaUploadBaseProps extends AriaAttributes {
  request: MaUploadRequest
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
  readOnly?: boolean
  accept?: string
  maxSize?: number
  maxCount?: number
  maxUrlLength?: number
  previewSize?: number
  listType?: 'text' | 'picture'
  label?: string
  id?: string
  name?: string
  className?: string
}

export interface MaUploadSingleProps extends MaUploadBaseProps {
  multiple?: false
  value?: string | null
  defaultValue?: string | null
  onChange?: (url: string) => void
}

export interface MaUploadMultipleProps extends MaUploadBaseProps {
  multiple: true
  value?: string[] | null
  defaultValue?: string[] | null
  onChange?: (urls: string[]) => void
}

export type MaUploadProps = MaUploadSingleProps | MaUploadMultipleProps
