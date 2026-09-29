import { useRef, type ChangeEvent } from 'react'
import { ImageIcon, LoaderCircle, Upload } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { cn } from '@/utils/cn'
import type { MaUploadProps } from '../types'
import { useUpload } from '../hooks/use-upload'
import { UploadFileItem } from './upload-file-item'

/** Upload input and list composition; transport remains a caller-provided port. */
export function MaUpload(props: MaUploadProps) {
  const {
    multiple = false,
    accept = '*',
    maxCount = Infinity,
    previewSize = 40,
    listType = 'text',
    label = '文件',
    id,
    name,
    className,
  } = props
  const { values, metadata, uploading, activeName, error, unavailable, uploadFiles, removeFile } = useUpload(props)
  const inputRef = useRef<HTMLInputElement>(null)
  const compact = listType === 'picture' && !multiple
  const inputDisabled = unavailable || uploading || (multiple && values.length >= maxCount)
  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    void uploadFiles(files)
  }
  const entry = (url: string) => (
    <UploadFileItem
      url={url}
      metadata={metadata[url]}
      listType={listType}
      multiple={multiple}
      label={label}
      previewSize={previewSize}
      disabled={unavailable || uploading}
      onRemove={removeFile}
    />
  )
  return (
    <div
      className={cn('space-y-2', className)}
      aria-busy={uploading}
      onDragOver={event => {
        event.preventDefault()
      }}
      onDrop={event => {
        event.preventDefault()
        void uploadFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <div className="flex items-center gap-3">
        {compact &&
          (values[0] ? (
            entry(values[0])
          ) : (
            <div
              className="flex items-center justify-center rounded-md border bg-muted text-muted-foreground"
              style={{ width: previewSize, height: previewSize, flexShrink: 0 }}
              aria-label={`未设置${label}`}
            >
              <ImageIcon size={20} aria-hidden="true" />
            </div>
          ))}
        <input
          id={id}
          name={name}
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept === '*' ? undefined : accept}
          aria-label={props['aria-label'] ?? `上传${label}`}
          aria-describedby={props['aria-describedby']}
          aria-invalid={props['aria-invalid']}
          disabled={inputDisabled}
          className="sr-only"
          onChange={selectFiles}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={inputDisabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {uploading ? '上传中…' : !multiple && values.length ? `更换${label}` : `上传${label}`}
        </Button>
        {uploading && (
          <span role="status" className="min-w-0 truncate text-xs text-muted-foreground">
            {activeName}
          </span>
        )}
      </div>
      {!compact && values.length > 0 && (
        <div className="space-y-2" role="list" aria-label={`${label}列表`}>
          {values.map(url => (
            <div key={url} role="listitem">
              {entry(url)}
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
