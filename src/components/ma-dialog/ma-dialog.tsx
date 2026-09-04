import { useCallback, useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { MaDialogAction, MaDialogActionContext, MaDialogProps } from './types'

function MaDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  children,
  footer,
  footerBefore,
  footerAfter,
  okText = '确定',
  cancelText = '取消',
  onOk,
  onCancel,
  onActionError,
  loading = false,
  fullscreen: fullscreenProp,
  defaultFullscreen = false,
  onFullscreenChange,
  showFullscreenButton = true,
  showCloseButton = true,
  disablePointerDismissal = true,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: MaDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [internalFullscreen, setInternalFullscreen] = useState(defaultFullscreen)
  const [okLoading, setOkLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const isOpen = openProp ?? internalOpen
  const fullscreen = fullscreenProp ?? internalFullscreen
  const actionLoading = loading || okLoading || cancelLoading

  const setOpen = useCallback((nextOpen: boolean) => {
    if (openProp === undefined) setInternalOpen(nextOpen)
    if (!nextOpen) {
      setOkLoading(false)
      setCancelLoading(false)
    }
    onOpenChange?.(nextOpen)
  }, [onOpenChange, openProp])

  const close = useCallback(() => setOpen(false), [setOpen])

  const setFullscreen = useCallback((nextFullscreen: boolean) => {
    if (fullscreenProp === undefined) setInternalFullscreen(nextFullscreen)
    onFullscreenChange?.(nextFullscreen)
  }, [fullscreenProp, onFullscreenChange])

  const runAction = useCallback((action: MaDialogAction, handler: MaDialogProps['onOk'] | MaDialogProps['onCancel']) => {
    if (!handler || actionLoading) {
      if (!handler) close()
      return
    }
    const setActionLoading = action === 'ok' ? setOkLoading : setCancelLoading
    const context: MaDialogActionContext = { close, setLoading: setActionLoading }
    let result: ReturnType<NonNullable<typeof handler>>
    try {
      result = handler(context)
    } catch (error) {
      setActionLoading(false)
      onActionError?.(error, action)
      return
    }
    if (result instanceof Promise) {
      setActionLoading(true)
      void result.then(value => {
        setActionLoading(false)
        if (value !== false) close()
      }).catch(error => {
        setActionLoading(false)
        onActionError?.(error, action)
      })
      return
    }
    if (result !== false) close()
  }, [actionLoading, close, onActionError])

  const handleOk = useCallback(() => runAction('ok', onOk), [onOk, runAction])
  const handleCancel = useCallback(() => runAction('cancel', onCancel), [onCancel, runAction])

  useEffect(() => {
    if (!isOpen || !onOk) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleOk()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleOk, isOpen, onOk])

  const defaultFooter = (
    <>
      <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>{cancelText}</Button>
      <Button onClick={handleOk} disabled={actionLoading}>{okText}</Button>
    </>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setOpen} disablePointerDismissal={disablePointerDismissal}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          'sm:max-w-sm',
          fullscreen && 'top-0! left-0! h-svh! max-w-none! translate-x-0! translate-y-0! rounded-none',
          contentClassName,
        )}
      >
        <DialogHeader className={cn('pr-10', headerClassName)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className={cn(!title && 'sr-only')}>{title || '对话框'}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
            {showFullscreenButton && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 shrink-0"
                aria-label={fullscreen ? '退出全屏' : '全屏显示'}
                onClick={() => setFullscreen(!fullscreen)}
              >
                {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className={cn('relative min-h-0', fullscreen && 'flex-1 overflow-y-auto', bodyClassName)} aria-busy={actionLoading || undefined}>
          {children}
        </div>
        {footer !== false && (
          <DialogFooter className={footerClassName}>
            {footerBefore}
            {footer ?? defaultFooter}
            {footerAfter}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { MaDialog }
