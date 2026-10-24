import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MaDrawerProps } from '../types'

type ResizeOptions = {
  open: boolean
  side: NonNullable<MaDrawerProps['side']>
  width: MaDrawerProps['width']
  resizable: boolean
}

function readDimensions(handle: HTMLDivElement) {
  const popup = handle.parentElement!
  const ownerWindow = handle.ownerDocument.defaultView!
  const root = handle.ownerDocument.documentElement
  const gutter = Number.parseFloat(ownerWindow.getComputedStyle(root).fontSize) || 16
  const max = Math.max(0, (root.clientWidth || ownerWindow.innerWidth) - gutter * 2)
  return { width: popup.getBoundingClientRect().width, min: Math.min(320, max), max }
}

export function useMaDrawerResize({ open, side, width, resizable }: ResizeOptions) {
  const [resize, setResize] = useState<ResizeOptions & { value?: number }>({ open, side, width, resizable })
  const [dimensions, setDimensions] = useState({ width: 0, min: 0, max: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const stopResizeRef = useRef<(() => void) | undefined>(undefined)
  const enabled = resizable && (side === 'left' || side === 'right')

  const configChanged = resize.side !== side || resize.width !== width || resize.resizable !== resizable
  if (resize.open !== open || configChanged) {
    // 保留关闭动画的宽度，在下次打开或调用方更改配置时恢复初始宽度。
    setResize({ open, side, width, resizable, value: configChanged || open ? undefined : resize.value })
  }

  useEffect(() => () => stopResizeRef.current?.(), [open, side, width, resizable])

  const separatorRef = useCallback((handle: HTMLDivElement | null) => {
    if (!handle?.parentElement) return
    const ownerWindow = handle.ownerDocument.defaultView!
    const measure = () => {
      const next = readDimensions(handle)
      setDimensions(current =>
        current.width === next.width && current.min === next.min && current.max === next.max ? current : next,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(handle.parentElement)
    ownerWindow.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      ownerWindow.removeEventListener('resize', measure)
      stopResizeRef.current?.()
    }
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!open || !enabled || event.button !== 0 || !event.isPrimary) return
    stopResizeRef.current?.()
    const handle = event.currentTarget
    const document = handle.ownerDocument
    const ownerWindow = document.defaultView!
    const bounds = readDimensions(handle)
    const startX = event.clientX
    const pointerId = event.pointerId
    const direction = side === 'right' ? -1 : 1
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    event.preventDefault()
    handle.focus({ preventScroll: true })
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      moveEvent.preventDefault()
      const value = Math.min(bounds.max, Math.max(bounds.min, bounds.width + (moveEvent.clientX - startX) * direction))
      setResize(current => ({ ...current, value }))
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
    if (!open || !enabled || event.altKey || event.ctrlKey || event.metaKey) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const bounds = readDimensions(event.currentTarget)
    const direction = side === 'right' ? -1 : 1
    const step = (event.shiftKey ? 64 : 16) * direction * (event.key === 'ArrowLeft' ? -1 : 1)
    const value = event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : bounds.width + step
    setResize(current => ({ ...current, value: Math.min(bounds.max, Math.max(bounds.min, value)) }))
  }

  const resizedWidth = enabled && resize.value !== undefined ? Math.min(resize.value, dimensions.max) : undefined
  const displayedWidth = Math.round(resizedWidth ?? dimensions.width)

  return {
    enabled,
    resizedWidth,
    separatorProps: {
      ref: separatorRef,
      tabIndex: 0,
      'data-resizing': isResizing ? '' : undefined,
      'aria-label': '调整抽屉宽度',
      'aria-valuemin': Math.min(dimensions.min, displayedWidth),
      'aria-valuemax': Math.max(dimensions.max, displayedWidth),
      'aria-valuenow': displayedWidth,
      'aria-valuetext': `${displayedWidth} 像素`,
      onPointerDown,
      onKeyDown,
      onDoubleClick: () => setResize(current => ({ ...current, value: undefined })),
    },
  }
}
