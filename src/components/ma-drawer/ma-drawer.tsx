import { useCallback, useImperativeHandle, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { MaDrawerAction, MaDrawerActionContext, MaDrawerFooterAlign, MaDrawerProps } from './types'

function MaDrawer<Payload = unknown>({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  children,
  footer,
  footerBefore,
  footerAfter,
  footerAlign = 'left',
  okText = '确定',
  cancelText = '取消',
  onOk,
  onCancel,
  onActionError,
  loading = false,
  side = 'right',
  width,
  showCloseButton = true,
  disablePointerDismissal = true,
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
  ...sheetRootProps
}: MaDrawerProps<Payload>) {
  const actionsRef = useRef<import('./types').DialogRootActions>(null)
  useImperativeHandle(actionsRefProp, () => ({ close: () => actionsRef.current?.close(), unmount: () => actionsRef.current?.unmount() }), [])
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [okLoading, setOkLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const isOpen = openProp ?? internalOpen
  const actionLoading = loading || okLoading || cancelLoading

  const setOpen = useCallback<NonNullable<MaDrawerProps['onOpenChange']>>((nextOpen, eventDetails) => {
    onOpenChange?.(nextOpen, eventDetails)
    if (eventDetails.isCanceled) return
    if (openProp === undefined) setInternalOpen(nextOpen)
    if (!nextOpen) {
      setOkLoading(false)
      setCancelLoading(false)
    }
  }, [onOpenChange, openProp])

  const close = useCallback(() => actionsRef.current?.close(), [])

  const runAction = useCallback((action: MaDrawerAction, handler: MaDrawerProps['onOk'] | MaDrawerProps['onCancel']) => {
    if (!handler || actionLoading) {
      if (!handler) close()
      return
    }
    const setActionLoading = action === 'ok' ? setOkLoading : setCancelLoading
    const context: MaDrawerActionContext = { close, setLoading: setActionLoading }
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
  const popupOnKeyDown = popupProps?.onKeyDown
  const handleKeyDown = useCallback<NonNullable<NonNullable<MaDrawerProps['popupProps']>['onKeyDown']>>(event => {
    popupOnKeyDown?.(event)
    if (!event.defaultPrevented && onOk && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleOk()
    }
  }, [handleOk, onOk, popupOnKeyDown])

  const defaultFooter = (
    <>
      <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>{cancelText}</Button>
      <Button onClick={handleOk} disabled={actionLoading}>{okText}</Button>
    </>
  )

  const footerAlignClasses: Record<MaDrawerFooterAlign, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  const renderContent = (body: ReactNode) => (
      <SheetContent
        {...popupProps}
        onKeyDown={handleKeyDown}
        portalProps={portalProps}
        backdropProps={backdropProps}
        closeProps={closeProps}
        side={side}
        showCloseButton={showCloseButton}
        initialFocus={initialFocus ?? popupProps?.initialFocus}
        finalFocus={finalFocus ?? popupProps?.finalFocus}
        className={state => cn(
          'flex flex-col gap-0 overflow-hidden rounded-xl p-0 outline-none',
          side === 'right' && 'inset-y-4! right-4! left-auto h-[calc(100svh-2rem)]! max-w-none!',
          side === 'right' && width === undefined && 'w-[min(30rem,calc(100vw-2rem))]!',
          side === 'left' && 'inset-y-4! left-4! right-auto h-[calc(100svh-2rem)]! max-w-none!',
          side === 'left' && width === undefined && 'w-[min(30rem,calc(100vw-2rem))]!',
          contentClassName,
          typeof popupProps?.className === 'function' ? popupProps.className(state) : popupProps?.className,
        )}
        style={state => ({ ...(typeof popupProps?.style === 'function' ? popupProps.style(state) : popupProps?.style), ...(width !== undefined ? { width } : {}) })}
      >
        <SheetHeader className={cn('shrink-0 gap-3 border-b p-0 px-5 py-3.5 pr-14', headerClassName)}>
          <SheetTitle className={cn(!title && 'sr-only')}>{title || '抽屉'}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5', bodyClassName)} aria-busy={actionLoading || undefined}>
          {body}
        </div>
        {footer !== false && (
          <SheetFooter className={cn('mt-auto flex shrink-0 flex-row items-center gap-2 border-t bg-muted p-0 px-5 py-3', footerAlignClasses[footerAlign], footerClassName)}>
            {footerBefore}
            {footer ?? defaultFooter}
            {footerAfter}
          </SheetFooter>
        )}
      </SheetContent>
  )

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setOpen}
      disablePointerDismissal={disablePointerDismissal}
      actionsRef={actionsRef}
      {...sheetRootProps}
    >
      {typeof children === 'function' ? payload => renderContent(children(payload)) : renderContent(children)}
    </Sheet>
  )
}

export { MaDrawer }
