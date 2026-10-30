import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

type DragOptions = {
  open: boolean
  draggable: boolean
  fullscreen: boolean
}

type DragOffset = { x: number; y: number }

function offsetPosition(position: CSSProperties['left'], offset: number) {
  const base = typeof position === 'number' ? `${position}px` : (position ?? '50%')
  return `calc(${base} + ${offset}px)`
}

export function useMaDialogDrag({ open, draggable, fullscreen }: DragOptions) {
  const enabled = draggable && !fullscreen
  const [drag, setDrag] = useState<{ open: boolean; enabled: boolean; offset?: DragOffset }>({ open, enabled })
  const stopDragRef = useRef<(() => void) | undefined>(undefined)

  if (drag.open !== open || drag.enabled !== enabled) {
    setDrag({ open, enabled, offset: drag.enabled === enabled && !open ? drag.offset : undefined })
  }

  useEffect(() => () => stopDragRef.current?.(), [open, enabled])

  const headerRef = useCallback((header: HTMLDivElement | null) => {
    if (!header) return
    const ownerWindow = header.ownerDocument.defaultView
    const resetPosition = () => {
      stopDragRef.current?.()
      setDrag(current => (current.offset ? { ...current, offset: undefined } : current))
    }
    ownerWindow?.addEventListener('resize', resetPosition)
    return () => {
      stopDragRef.current?.()
      ownerWindow?.removeEventListener('resize', resetPosition)
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
    const bounds = popup.getBoundingClientRect()
    const root = document.documentElement
    const gutter = Number.parseFloat(ownerWindow.getComputedStyle(root).fontSize) || 16
    const viewportWidth = root.clientWidth || ownerWindow.innerWidth
    const viewportHeight = root.clientHeight || ownerWindow.innerHeight
    const minX = gutter - bounds.left
    const maxX = Math.max(minX, viewportWidth - gutter - bounds.right)
    const minY = gutter - bounds.top
    const maxY = Math.max(minY, viewportHeight - gutter - bounds.bottom)
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
      setDrag(current => ({ ...current, offset }))
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
      left: offsetPosition(style.left, drag.offset.x),
      top: offsetPosition(style.top, drag.offset.y),
    }
  }

  return { enabled, getPopupStyle, headerProps: { ref: headerRef, onPointerDown } }
}
