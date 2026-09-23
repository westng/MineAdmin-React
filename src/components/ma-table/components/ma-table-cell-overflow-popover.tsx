import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/reui/primitives/popover'

interface MaTableCellOverflowPopoverProps {
  children: React.ReactNode
  content: string
}

export function MaTableCellOverflowPopover({ children, content }: MaTableCellOverflowPopoverProps) {
  const triggerRef = React.useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = React.useState(false)

  const measureOverflow = React.useCallback(() => {
    const node = triggerRef.current
    if (!node) return
    setOverflowing(node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight)
  }, [])

  React.useLayoutEffect(() => {
    measureOverflow()
    const node = triggerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measureOverflow)
    observer.observe(node)
    return () => observer.disconnect()
  }, [measureOverflow, content])

  const trigger = (
    <span ref={triggerRef} data-slot="ma-table-cell-overflow-trigger" className="block min-w-0 truncate">
      {children}
    </span>
  )

  if (!overflowing) return trigger

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        side="top"
        align="start"
        className="w-auto max-w-[min(32rem,calc(100vw-2rem))] whitespace-pre-wrap break-words"
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
