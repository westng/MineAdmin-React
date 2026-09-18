import * as React from 'react'
import { cn } from '@/utils/cn'

export interface MaTableToolbarProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  className?: string
  ariaLabel?: string
}

function hasToolbarContent(node: React.ReactNode): boolean {
  if (node == null || typeof node === 'boolean') return false
  if (Array.isArray(node)) return node.some(hasToolbarContent)
  if (React.isValidElement(node) && node.type === React.Fragment)
    return hasToolbarContent((node as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  return true
}

export function MaTableToolbar({
  left,
  center,
  right,
  className,
  ariaLabel = '表格工具栏',
}: MaTableToolbarProps): React.ReactElement {
  const hasLeft = hasToolbarContent(left)
  const hasCenter = hasToolbarContent(center)
  const hasRight = hasToolbarContent(right)

  return (
    <div
      className={cn('flex flex-col gap-3 border-b px-3 py-3 lg:flex-row lg:items-center lg:justify-between', className)}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {hasLeft && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{left}</div>}
      {hasCenter && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-1.5 lg:justify-center">
          {center}
        </div>
      )}
      {hasRight && <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:justify-end">{right}</div>}
    </div>
  )
}
