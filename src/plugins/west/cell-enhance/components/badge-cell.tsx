import { cn } from '@/lib/utils'
import { useDictionaryOptions } from '../hooks/use-dictionary-options'
import type { BadgeCellProps } from '../types'
import { resolveBadgeCell } from '../utils/badge-utils'
import { BadgeItem } from './badge-item'

export function BadgeCell({ dictName, options, ...props }: BadgeCellProps) {
  const dictionary = useDictionaryOptions(options === undefined ? dictName : undefined)
  const { items, emptyText, containerClassName } = resolveBadgeCell({ ...props, options }, dictionary)

  if (!items.length) {
    return <span className={cn('text-muted-foreground', containerClassName)}>{emptyText}</span>
  }

  return (
    <span className={cn('inline-flex max-w-full flex-wrap items-center gap-1 align-middle', containerClassName)}>
      {items.map(item => <BadgeItem key={item.key} item={item} />)}
    </span>
  )
}
