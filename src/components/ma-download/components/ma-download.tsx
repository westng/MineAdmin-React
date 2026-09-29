import { useId } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { cn } from '@/utils/cn'
import { useDownload } from '../hooks/use-download'
import type { MaDownloadProps } from '../types'

export function MaDownload({
  url,
  blob,
  request,
  filename,
  onDownloadingChange,
  onSuccess,
  onError,
  children = '下载',
  icon = <Download aria-hidden="true" />,
  loadingText = '下载中…',
  wrapperClassName,
  disabled,
  onClick,
  variant = 'outline',
  size = 'sm',
  ...buttonProps
}: MaDownloadProps) {
  const source = request ? { request } : blob ? { blob } : { url: url ?? '' }
  const { downloading, error, download } = useDownload({
    ...source,
    filename,
    disabled,
    onDownloadingChange,
    onSuccess,
    onError,
  })
  const errorId = useId()
  const describedBy = [buttonProps['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ')

  return (
    <span className={cn('inline-flex max-w-full flex-col gap-1 align-middle', wrapperClassName)}>
      <Button
        {...buttonProps}
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || downloading}
        aria-busy={downloading}
        aria-describedby={describedBy || undefined}
        onClick={event => {
          onClick?.(event)
          if (!event.defaultPrevented) void download()
        }}
      >
        {downloading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
        {downloading ? loadingText : children}
      </Button>
      {error && (
        <span id={errorId} role="alert" className="text-sm break-words text-destructive">
          {error}
        </span>
      )}
    </span>
  )
}
