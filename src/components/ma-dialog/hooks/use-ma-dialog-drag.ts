import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

type DragOptions = {
  open: boolean
  draggable: boolean
  fullscreen: boolean
}

type DragOffset = { x: number; y: number }
type DragState = {
  open: boolean
  enabled: boolean
  offset?: DragOffset
  position?: Pick<CSSProperties, 'left' | 'top'>
}

function getDragLimits(popup: HTMLElement, ownerWindow: Window) {
  const bounds = popup.getBoundingClientRect()
  const root = popup.ownerDocument.documentElement
  const gutter = Number.parseFloat(ownerWindow.getComputedStyle(root).fontSize) || 16
  const viewportWidth = root.clientWidth || ownerWindow.innerWidth
  const viewportHeight = root.clientHeight || ownerWindow.innerHeight
  const minX = gutter - bounds.left
  const minY = gutter - bounds.top
  return {
    minX,
    maxX: Math.max(minX, viewportWidth - gutter - bounds.right),
    minY,
    maxY: Math.max(minY, viewportHeight - gutter - bounds.bottom),
  }
}

function offsetPosition(position: CSSProperties['left'], offset: number) {
  const base = typeof position === 'number' ? `${position}px` : (position ?? '50%')
  return `calc(${base} + ${offset}px)`
}

export function useMaDialogDrag({ open, draggable, fullscreen }: DragOptions) {
  const enabled = draggable && !fullscreen
  const [drag, setDrag] = useState<DragState>({ open, enabled })
  const stopDragRef = useRef<(() => void) | undefined>(undefined)

  if (drag.open !== open || drag.enabled !== enabled) {
    const preservePosition = drag.enabled === enabled && !open
    setDrag({
      open,
      enabled,
      offset: preservePosition ? drag.offset : undefined,
      position: preservePosition ? drag.position : undefined,
    })
  }

  useEffect(() => () => stopDragRef.current?.(), [open, enabled])

  const headerRef = useCallback((header: HTMLDivElement | null) => {
    if (!header) return
    const popup = header.parentElement
    const ownerWindow = header.ownerDocument.defaultView
    if (!popup || !ownerWindow) return
    const resetPosition = () => {
      stopDragRef.current?.()
      setDrag(current => (current.offset ? { ...current, offset: undefined, position: undefined } : current))
    }
    let previousSize: { width: number; height: number } | undefined
    const observer = ownerWindow.ResizeObserver
      ? new ownerWindow.ResizeObserver(([entry]) => {
          if (!entry) return
          const size = entry.borderBoxSize[0]
          const bounds = popup.getBoundingClientRect()
          const width = size?.inlineSize ?? bounds.width
          const height = size?.blockSize ?? bounds.height
          if (previousSize?.width === width && previousSize?.height === height) return
          previousSize = { width, height }
          stopDragRef.current?.()
          const { minX, maxX, minY, maxY } = getDragLimits(popup, ownerWindow)
          const deltaX = Math.min(maxX, Math.max(minX, 0))
          const deltaY = Math.min(maxY, Math.max(minY, 0))
          if (!deltaX && !deltaY) return
          setDrag(current =>
            current.open && current.enabled && current.offset
              ? {
                  ...current,
                  offset: { x: current.offset.x + deltaX, y: current.offset.y + deltaY },
                }
              : current,
          )
        })
      : undefined
    observer?.observe(popup, { box: 'border-box' })
    ownerWindow.addEventListener('resize', resetPosition)
    return () => {
      stopDragRef.current?.()
      observer?.disconnect()
      ownerWindow.removeEventListener('resize', resetPosition)
    }
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!open || !enabled || event.defaultPrevented || event.button !== 0 || !event.isPrimary) return
    const header = event.currentTarget
    const popup = header.parentElement
    const document = header.ownerDocument
    const ownerWindow = document.defaultView
    if (!popup || !ownerWindow) return
    if (event.target instanceof ownerWindow.Element) {
      const interactiveTarget = event.target.closest(
        'a, button, input, select, textarea, label, summary, [tabindex], [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"]), [draggable="true"]',
      )
      if (interactiveTarget && header.contains(interactiveTarget)) return
    }

    stopDragRef.current?.()
    const { minX, maxX, minY, maxY } = getDragLimits(popup, ownerWindow)
    const popupStyle = ownerWindow.getComputedStyle(popup)
    const position = drag.position ?? { left: popupStyle.left || undefined, top: popupStyle.top || undefined }
    const startX = event.clientX
    const startY = event.clientY
    const startOffset = drag.offset ?? { x: 0, y: 0 }
    const pointerId = event.pointerId
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    event.preventDefault()
    document.body.style.cursor = 'move'
    document.body.style.userSelect = 'none'

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      moveEvent.preventDefault()
      const offset = {
        x: startOffset.x + Math.min(maxX, Math.max(minX, moveEvent.clientX - startX)),
        y: startOffset.y + Math.min(maxY, Math.max(minY, moveEvent.clientY - startY)),
      }
      setDrag(current => ({ ...current, offset, position }))
    }
    const stop = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onEnd)
      document.removeEventListener('pointercancel', onEnd)
      header.removeEventListener('lostpointercapture', onEnd)
      ownerWindow.removeEventListener('blur', stop)
      stopDragRef.current = undefined
      if (header.hasPointerCapture?.(pointerId)) header.releasePointerCapture(pointerId)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    const onEnd = (endEvent: globalThis.PointerEvent) => {
      if (endEvent.pointerId === pointerId) stop()
    }
    stopDragRef.current = stop
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onEnd)
    document.addEventListener('pointercancel', onEnd)
    header.addEventListener('lostpointercapture', onEnd)
    ownerWindow.addEventListener('blur', stop)
    header.setPointerCapture?.(pointerId)
  }

  const getPopupStyle = (style: CSSProperties = {}): CSSProperties => {
    if (!enabled || !drag.offset) return style
    return {
      ...style,
      left: offsetPosition(style.left ?? drag.position?.left, drag.offset.x),
      top: offsetPosition(style.top ?? drag.position?.top, drag.offset.y),
    }
  }

  return { enabled, getPopupStyle, headerProps: { ref: headerRef, onPointerDown } }
}
