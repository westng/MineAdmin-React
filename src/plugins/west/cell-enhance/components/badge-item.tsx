import { Badge } from '@/components/reui/badge'
import type { BadgeCellItem } from '../types'

export function BadgeItem({ item }: { item: BadgeCellItem }) {
  return (
    <Badge {...item.badgeProps}>
      {item.leading}
      {item.dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {item.label}
      {item.trailing}
    </Badge>
  )
}
