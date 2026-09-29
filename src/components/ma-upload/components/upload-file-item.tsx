import { FileIcon, X } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import type { UploadFileMetadata } from '../types/internal'
import { uploadFileName } from '../utils/upload-utils'

interface UploadFileItemProps {
  url: string
  metadata?: UploadFileMetadata
  listType: 'text' | 'picture'
  multiple: boolean
  label: string
  previewSize: number
  disabled: boolean
  onRemove: (url: string) => void
}

/** Presentation only: no requests or upload state. */
export function UploadFileItem({
  url,
  metadata,
  listType,
  multiple,
  label,
  previewSize,
  disabled,
  onRemove,
}: UploadFileItemProps) {
  const title = metadata?.name ?? uploadFileName(url)
  const compact = listType === 'picture' && !multiple
  const showImage = listType === 'picture' && (!metadata?.type || metadata.type.startsWith('image/'))
  return (
    <div className="flex min-w-0 items-center gap-3" data-upload-file={url}>
      {showImage ? (
        <img
          src={url}
          alt={multiple ? title : label}
          width={previewSize}
          height={previewSize}
          className="rounded-md border"
          style={{ width: previewSize, height: previewSize, flexShrink: 0, objectFit: 'cover' }}
        />
      ) : (
        <FileIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      {!compact && (
        <span className="min-w-0 flex-1 truncate text-sm" title={title}>
          {title}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`移除${compact ? label : title}`}
        disabled={disabled}
        onClick={() => onRemove(url)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
