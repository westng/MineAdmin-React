import { useContext } from 'react'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/reui/primitives/sheet'
import { cn } from '@/utils/cn'
import { MaDrawerHeaderContext } from '../context/header-context'
import type { MaDrawerHeaderProps } from '../types'

export function MaDrawerDefaultHeader({
  title,
  description,
  className,
}: Extract<MaDrawerHeaderProps, { variant?: 'default' }>) {
  const { showCloseButton } = useContext(MaDrawerHeaderContext)
  const hasTitle = title !== undefined && title !== null && typeof title !== 'boolean' && title !== ''

  return (
    <div data-slot="ma-drawer-header" data-variant="default" className="min-w-0 shrink-0">
      <SheetHeader
        className={cn(
          'gap-3 border-b p-0 px-[var(--ma-drawer-padding-x,1.25rem)] py-3.5',
          showCloseButton && 'pr-[calc(var(--ma-drawer-padding-x,1.25rem)+2.25rem)]',
          className,
        )}
      >
        <SheetTitle className={cn('min-w-0 [overflow-wrap:anywhere]', !hasTitle && 'sr-only')}>
          {hasTitle ? title : '抽屉'}
        </SheetTitle>
        {description && <SheetDescription>{description}</SheetDescription>}
      </SheetHeader>
    </div>
  )
}
