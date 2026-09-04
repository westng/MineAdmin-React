import * as React from 'react'
import { cn } from '@/lib/utils'

interface MaTableToolbarProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export function MaTableToolbar({ left, center, right, className }: MaTableToolbarProps): React.ReactElement {
  return (
    <div className={cn('flex items-center gap-2 border-b px-3 py-2', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2">{left}</div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">{center}</div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">{right}</div>
    </div>
  )
}
