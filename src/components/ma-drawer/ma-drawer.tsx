import { useCallback, useEffect, useState } from 'react'
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
import type { MaDrawerAction, MaDrawerActionContext, MaDrawerProps } from './types'

function MaDrawer({
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
  side = 'right',
  showCloseButton = true,
  disablePointerDismissal = true,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: MaDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [okLoading, setOkLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const isOpen = openProp ?? internalOpen
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
    <Sheet open={isOpen} onOpenChange={setOpen} disablePointerDismissal={disablePointerDismissal}>
      <SheetContent
        side={side}
        showCloseButton={showCloseButton}
        className={cn(
          'flex flex-col gap-0 overflow-hidden rounded-xl p-0 outline-none',
          side === 'right' && 'inset-y-4! right-4! left-auto h-[calc(100svh-2rem)]! w-[min(30rem,calc(100vw-2rem))]! max-w-none!',
          side === 'left' && 'inset-y-4! left-4! right-auto h-[calc(100svh-2rem)]! w-[min(30rem,calc(100vw-2rem))]! max-w-none!',
          contentClassName,
        )}
      >
        <SheetHeader className={cn('shrink-0 gap-3 border-b p-0 px-5 py-3.5 pr-14', headerClassName)}>
          <SheetTitle className={cn(!title && 'sr-only')}>{title || '抽屉'}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5', bodyClassName)} aria-busy={actionLoading || undefined}>
          {children}
        </div>
        {footer !== false && (
          <SheetFooter className={cn('mt-auto flex shrink-0 flex-row items-center gap-2 border-t bg-muted p-0 px-5 py-3', footerClassName)}>
            {footerBefore}
            {footer ?? defaultFooter}
            {footerAfter}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

export { MaDrawer }
