import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

function readDimensions(handle: HTMLDivElement) {
  const panel = handle.parentElement!
  const width = panel.getBoundingClientRect().width
  const contentWidth = panel.previousElementSibling?.getBoundingClientRect().width ?? 0
  // AI 面板至多 640px，并为相邻主内容尽量保留 320px。
  return { width, min: 320, max: Math.max(320, Math.min(640, width + contentWidth - 320)) }
}

export function usePanelResize() {
  const [width, setWidth] = useState<number>()
  const [dimensions, setDimensions] = useState({ width: 320, min: 320, max: 640 })
  const [isResizing, setIsResizing] = useState(false)
  const stopResizeRef = useRef<(() => void) | undefined>(undefined)

  const separatorRef = useCallback((handle: HTMLDivElement | null) => {
    if (!handle?.parentElement) return
    const panel = handle.parentElement
    const ownerWindow = handle.ownerDocument.defaultView!
    const measure = () => {
      const next = readDimensions(handle)
      setDimensions(current => (current.width === next.width && current.max === next.max ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    if (panel.previousElementSibling) observer.observe(panel.previousElementSibling)
    ownerWindow.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      ownerWindow.removeEventListener('resize', measure)
      stopResizeRef.current?.()
    }
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return
    stopResizeRef.current?.()
    const handle = event.currentTarget
    const document = handle.ownerDocument
    const ownerWindow = document.defaultView!
    const bounds = readDimensions(handle)
    const startX = event.clientX
    const pointerId = event.pointerId
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    event.preventDefault()
    handle.focus({ preventScroll: true })
    setDimensions(bounds)
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      moveEvent.preventDefault()
      const current = readDimensions(handle)
      setWidth(Math.min(current.max, Math.max(current.min, bounds.width + startX - moveEvent.clientX)))
    }
    const stop = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onEnd)
      document.removeEventListener('pointercancel', onEnd)
      handle.removeEventListener('lostpointercapture', onEnd)
      ownerWindow.removeEventListener('blur', stop)
      stopResizeRef.current = undefined
      setIsResizing(false)
      if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    const onEnd = (endEvent: globalThis.PointerEvent) => {
      if (endEvent.pointerId === pointerId) stop()
    }
    stopResizeRef.current = stop
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onEnd)
    document.addEventListener('pointercancel', onEnd)
    handle.addEventListener('lostpointercapture', onEnd)
    ownerWindow.addEventListener('blur', stop)
    handle.setPointerCapture?.(pointerId)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const bounds = readDimensions(event.currentTarget)
    setDimensions(bounds)
    const step = (event.shiftKey ? 64 : 16) * (event.key === 'ArrowLeft' ? 1 : -1)
    const next = event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : bounds.width + step
    setWidth(Math.min(bounds.max, Math.max(bounds.min, next)))
  }

  const resizedWidth = width === undefined ? undefined : Math.min(width, dimensions.max)

  return {
    resizedWidth,
    separatorProps: {
      ref: separatorRef,
      tabIndex: 0,
      'data-resizing': isResizing ? '' : undefined,
      'aria-valuemin': dimensions.min,
      'aria-valuemax': dimensions.max,
      'aria-valuenow': Math.round(resizedWidth ?? dimensions.width),
      onPointerDown,
      onKeyDown,
      onDoubleClick: () => setWidth(undefined),
    },
  }
}
