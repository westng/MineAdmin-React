import { useCallback, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'
import { cn } from '@/utils/cn'
import type { MaDialogAction, MaDialogActionContext, MaDialogProps } from './types'

function MaDialog<Payload = unknown>({
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
  size = 'md',
  height,
  maxHeight,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  initialFocus,
  finalFocus,
  popupProps,
  portalProps,
  backdropProps,
  closeProps,
  actionsRef: actionsRefProp,
  ...dialogRootProps
}: MaDialogProps<Payload>) {
  const actionsRef = useRef<import('./types').DialogRootActions>(null)
  useImperativeHandle(
    actionsRefProp,
    () => ({ close: () => actionsRef.current?.close(), unmount: () => actionsRef.current?.unmount() }),
    [],
  )
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [internalFullscreen, setInternalFullscreen] = useState(defaultFullscreen)
  const [okLoading, setOkLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const isOpen = openProp ?? internalOpen
  const fullscreen = fullscreenProp ?? internalFullscreen
  const actionLoading = loading || okLoading || cancelLoading

  const setOpen = useCallback<NonNullable<MaDialogProps['onOpenChange']>>(
    (nextOpen, eventDetails) => {
      onOpenChange?.(nextOpen, eventDetails)
      if (eventDetails.isCanceled) return
      if (openProp === undefined) setInternalOpen(nextOpen)
      if (!nextOpen) {
        setOkLoading(false)
        setCancelLoading(false)
      }
    },
    [onOpenChange, openProp],
  )

  const close = useCallback(() => actionsRef.current?.close(), [])

  const setFullscreen = useCallback(
    (nextFullscreen: boolean) => {
      if (fullscreenProp === undefined) setInternalFullscreen(nextFullscreen)
      onFullscreenChange?.(nextFullscreen)
    },
    [fullscreenProp, onFullscreenChange],
  )

  const runAction = useCallback(
    (action: MaDialogAction, handler: MaDialogProps['onOk'] | MaDialogProps['onCancel']) => {
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
        void result
          .then(value => {
            setActionLoading(false)
            if (value !== false) close()
          })
          .catch(error => {
            setActionLoading(false)
            onActionError?.(error, action)
          })
        return
      }
      if (result !== false) close()
    },
    [actionLoading, close, onActionError],
  )

  const handleOk = useCallback(() => runAction('ok', onOk), [onOk, runAction])
  const handleCancel = useCallback(() => runAction('cancel', onCancel), [onCancel, runAction])
  const popupOnKeyDown = popupProps?.onKeyDown
  const handleKeyDown = useCallback<NonNullable<NonNullable<MaDialogProps['popupProps']>['onKeyDown']>>(
    event => {
      popupOnKeyDown?.(event)
      if (!event.defaultPrevented && onOk && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleOk()
      }
    },
    [handleOk, onOk, popupOnKeyDown],
  )

  const defaultFooter = (
    <>
      <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>
        {cancelText}
      </Button>
      <Button onClick={handleOk} disabled={actionLoading}>
        {okText}
      </Button>
    </>
  )

  const sizeClasses: Record<string, string> = {
    xs: 'sm:max-w-xs',
    sm: 'sm:max-w-sm md:max-w-md',
    md: 'sm:max-w-md md:max-w-lg lg:max-w-xl',
    lg: 'sm:max-w-lg md:max-w-xl lg:max-w-2xl',
    xl: 'sm:max-w-xl md:max-w-2xl lg:max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)]',
  }

  const renderContent = (body: ReactNode) => (
    <DialogContent
      {...popupProps}
      onKeyDown={handleKeyDown}
      portalProps={portalProps}
      backdropProps={backdropProps}
      closeProps={closeProps}
      showCloseButton={showCloseButton}
      initialFocus={initialFocus ?? popupProps?.initialFocus}
      finalFocus={finalFocus ?? popupProps?.finalFocus}
      className={state =>
        cn(
          'flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0',
          sizeClasses[size],
          fullscreen && 'top-0! left-0! h-svh! max-w-none! translate-x-0! translate-y-0! rounded-none',
          contentClassName,
          typeof popupProps?.className === 'function' ? popupProps.className(state) : popupProps?.className,
        )
      }
      style={state => ({
        ...(typeof popupProps?.style === 'function' ? popupProps.style(state) : popupProps?.style),
        ...(height !== undefined ? { height } : {}),
        ...(maxHeight !== undefined ? { maxHeight } : {}),
        ...(fullscreen ? { height: '100svh', maxHeight: '100svh' } : {}),
      })}
    >
      <DialogHeader className={cn('shrink-0 p-4 pr-14', headerClassName)}>
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
      <div
        className={cn('relative min-h-0 flex-1 overflow-y-auto px-4 pb-4', bodyClassName)}
        aria-busy={actionLoading || undefined}
      >
        {body}
      </div>
      {footer !== false && (
        <DialogFooter className={cn('m-0 shrink-0', footerClassName)}>
          {footerBefore}
          {footer ?? defaultFooter}
          {footerAfter}
        </DialogFooter>
      )}
    </DialogContent>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setOpen}
      disablePointerDismissal={disablePointerDismissal}
      actionsRef={actionsRef}
      {...dialogRootProps}
    >
      {typeof children === 'function' ? payload => renderContent(children(payload)) : renderContent(children)}
    </Dialog>
  )
}

export { MaDialog }
