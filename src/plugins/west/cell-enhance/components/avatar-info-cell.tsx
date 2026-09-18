import { Badge } from '@/components/reui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'
import { cn } from '@/utils/cn'
import type { AvatarInfoCellProps } from '../types/avatar-info'
import { avatarInfoInitials, avatarInfoText } from '../utils/avatar-info-utils'

export function AvatarInfoCell({
  avatar,
  name,
  badge,
  description,
  fallback,
  emptyText = '-',
  avatarSize,
  badgeProps,
  className,
  ...props
}: AvatarInfoCellProps) {
  const imageUrl = typeof avatar === 'string' ? avatarInfoText(avatar) : undefined
  const displayName = avatarInfoText(name)
  const badgeText = avatarInfoText(badge)
  const descriptionText = avatarInfoText(description)
  const compact = !badgeText && !descriptionText

  if (!imageUrl && !displayName && !badgeText && !descriptionText) {
    return <div {...props} className={cn('text-muted-foreground', className)}>{emptyText}</div>
  }

  return (
    <div {...props} className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <Avatar size={avatarSize ?? (compact ? 'sm' : 'default')}>
        {imageUrl && <AvatarImage src={imageUrl} alt={displayName ?? ''} />}
        <AvatarFallback>{avatarInfoText(fallback) ?? avatarInfoInitials(displayName)}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate', compact ? 'text-xs font-medium' : 'text-sm font-semibold')} title={displayName}>{displayName ?? emptyText}</span>
          {badgeText && <Badge variant="default" size="xs" {...badgeProps}>{badgeText}</Badge>}
        </div>
        {descriptionText && <span className="text-muted-foreground truncate text-xs" title={descriptionText}>{descriptionText}</span>}
      </div>
    </div>
  )
}
