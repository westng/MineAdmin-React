import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/reui/primitives/button'
import { Separator } from '@/components/reui/primitives/separator'
import { Sheet, SheetContent, SheetFooter } from '@/components/reui/primitives/sheet'
import { cn } from '@/utils/cn'
import { MaDrawerHeaderContext } from '../context/header-context'
import { useMaDrawerResize } from '../hooks/use-ma-drawer-resize'
import type { MaDrawerAction, MaDrawerActionContext, MaDrawerFooterAlign, MaDrawerProps } from '../types'
import { MaDrawerHeader } from './ma-drawer-header'

function MaDrawer<Payload = unknown>({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  header,
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
  resizable = true,
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
  const actionsRef = useRef<import('../types').DialogRootActions>(null)
  useImperativeHandle(
    actionsRefProp,
    () => ({ close: () => actionsRef.current?.close(), unmount: () => actionsRef.current?.unmount() }),
    [],
  )
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [okLoading, setOkLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const isOpen = openProp ?? internalOpen
  const sessionRef = useRef<{ busy: boolean } | null>(null)
  useLayoutEffect(() => {
    sessionRef.current = isOpen ? { busy: false } : null
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 新打开会话和Activity恢复必须清理已失效操作的本地状态。
    setOkLoading(false)
    setCancelLoading(false)
    return () => {
      sessionRef.current = null
    }
  }, [isOpen])
  const actionLoading = loading || okLoading || cancelLoading
  const {
    enabled: resizeEnabled,
    resizedWidth,
    separatorProps,
  } = useMaDrawerResize({
    open: isOpen,
    side,
    width,
    resizable,
  })

  const setOpen = useCallback<NonNullable<MaDrawerProps['onOpenChange']>>(
    (nextOpen, eventDetails) => {
      onOpenChange?.(nextOpen, eventDetails)
      if (eventDetails.isCanceled) return
      if (openProp === undefined) setInternalOpen(nextOpen)
      if (!nextOpen) {
        sessionRef.current = null
        setOkLoading(false)
        setCancelLoading(false)
      }
    },
    [onOpenChange, openProp],
  )

  const close = useCallback(() => actionsRef.current?.close(), [])

  const runAction = useCallback(
    (action: MaDrawerAction, handler: MaDrawerProps['onOk'] | MaDrawerProps['onCancel']) => {
      const session = sessionRef.current
      if (!session) return
      if (!handler || actionLoading || session.busy) {
        if (!handler) close()
        return
      }
      const current = () => sessionRef.current === session
      const actionClose = () => {
        if (current()) close()
      }
      const setActionLoading = (value: boolean) => {
        if (!current()) return
        session.busy = value
        ;(action === 'ok' ? setOkLoading : setCancelLoading)(value)
      }
      const context: MaDrawerActionContext = { close: actionClose, setLoading: setActionLoading }
      let result: ReturnType<NonNullable<typeof handler>>
      try {
        result = handler(context)
      } catch (error) {
        setActionLoading(false)
        if (current()) onActionError?.(error, action)
        return
      }
      if (result instanceof Promise) {
        setActionLoading(true)
        void result
          .then(value => {
            setActionLoading(false)
            if (value !== false) actionClose()
          })
          .catch(error => {
            setActionLoading(false)
            if (current()) onActionError?.(error, action)
          })
        return
      }
      if (result !== false) actionClose()
    },
    [actionLoading, close, onActionError],
  )

  const handleOk = useCallback(() => runAction('ok', onOk), [onOk, runAction])
  const handleCancel = useCallback(() => runAction('cancel', onCancel), [onCancel, runAction])
  const popupOnKeyDown = popupProps?.onKeyDown
  const handleKeyDown = useCallback<NonNullable<NonNullable<MaDrawerProps['popupProps']>['onKeyDown']>>(
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
      className={state =>
        cn(
          'flex flex-col gap-0 rounded-xl p-0 outline-none [--ma-drawer-padding-x:1.25rem]',
          resizeEnabled ? 'overflow-visible!' : 'overflow-hidden',
          side === 'right' && 'inset-y-4! right-4! left-auto h-[calc(100svh-2rem)]! max-w-none!',
          side === 'right' && width === undefined && resizedWidth === undefined && 'w-[min(30rem,calc(100vw-2rem))]!',
          side === 'left' && 'inset-y-4! left-4! right-auto h-[calc(100svh-2rem)]! max-w-none!',
          side === 'left' && width === undefined && resizedWidth === undefined && 'w-[min(30rem,calc(100vw-2rem))]!',
          contentClassName,
          typeof popupProps?.className === 'function' ? popupProps.className(state) : popupProps?.className,
        )
      }
      style={state => ({
        ...(typeof popupProps?.style === 'function' ? popupProps.style(state) : popupProps?.style),
        ...(width !== undefined ? { width } : {}),
        ...(resizedWidth !== undefined ? { width: resizedWidth } : {}),
      })}
    >
      <div
        data-slot="ma-drawer-panel"
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[inherit]"
      >
        {header !== false && (
          <MaDrawerHeader {...header} title={title} description={description} className={headerClassName} />
        )}
        <div
          data-slot="ma-drawer-body"
          className={cn('min-h-0 flex-1 overflow-y-auto px-[var(--ma-drawer-padding-x)] py-5', bodyClassName)}
          aria-busy={actionLoading || undefined}
        >
          {body}
        </div>
        {footer !== false && (
          <SheetFooter
            className={cn(
              'mt-auto flex shrink-0 flex-row items-center gap-2 border-t bg-muted p-0 px-[var(--ma-drawer-padding-x)] py-3',
              footerAlignClasses[footerAlign],
              footerClassName,
            )}
          >
            {footerBefore}
            {footer ?? defaultFooter}
            {footerAfter}
          </SheetFooter>
        )}
      </div>
      {resizeEnabled && (
        <Separator
          {...separatorProps}
          orientation="vertical"
          data-slot="ma-drawer-resize-handle"
          className={cn(
            'absolute top-1/2 z-10 h-24 w-3! -translate-y-1/2 cursor-col-resize touch-none select-none rounded-full bg-transparent outline-none',
            'after:absolute after:top-1/2 after:left-1/2 after:h-9 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-muted-foreground/50 hover:after:bg-primary focus-visible:after:bg-primary data-resizing:after:bg-primary',
            'after:transition-transform after:duration-150 after:ease-out data-resizing:after:scale-y-200 motion-reduce:after:transition-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            side === 'right' ? '-left-4' : '-right-4',
          )}
        />
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
      {typeof children === 'function' ? (
        payload => (
          <MaDrawerHeaderContext.Provider value={{ showCloseButton }}>
            {renderContent(children(payload))}
          </MaDrawerHeaderContext.Provider>
        )
      ) : (
        <MaDrawerHeaderContext.Provider value={{ showCloseButton }}>
          {renderContent(children)}
        </MaDrawerHeaderContext.Provider>
      )}
    </Sheet>
  )
}

export { MaDrawer }
