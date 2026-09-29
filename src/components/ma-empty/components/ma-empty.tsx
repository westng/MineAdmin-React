import { useId, type ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/reui/primitives/empty'
import { cn } from '@/utils/cn'
import { SearchCardsIllustration } from '../illustrations/search-cards-illustration'
import type { MaEmptyProps } from '../types'

function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && typeof value !== 'boolean' && value !== ''
}

export function MaEmpty({
  type = 'search',
  size = 'default',
  title = '暂无数据',
  description,
  image,
  actions,
  children,
  className,
  classNames,
  ...props
}: MaEmptyProps) {
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const media = image === undefined ? type === 'search' ? <SearchCardsIllustration /> : <Inbox /> : image
  const showImage = hasContent(media)
  const showTitle = hasContent(title)
  const showDescription = hasContent(description)
  const showActions = hasContent(actions)
  const showChildren = hasContent(children)

  return (
    <Empty
      role="status"
      {...props}
      data-type={type}
      data-size={size}
      className={cn(size === 'sm' ? 'gap-3 px-4 py-6' : 'py-12', className)}
      aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : showTitle ? titleId : undefined)}
      aria-describedby={props['aria-describedby'] ?? (showDescription ? descriptionId : undefined)}
    >
      {(showImage || showTitle || showDescription) && (
        <EmptyHeader className={cn('min-w-0 w-full', classNames?.header)}>
          {showImage && (
            <EmptyMedia
              aria-hidden="true"
              variant={image === undefined && type === 'simple' ? 'icon' : 'default'}
              className={cn(
                'max-w-full',
                size === 'sm' && type === 'search' && image === undefined && 'zoom-75',
                classNames?.image,
              )}
            >
              {media}
            </EmptyMedia>
          )}
          {showTitle && (
            <EmptyTitle id={titleId} className={cn('max-w-full wrap-anywhere', classNames?.title)}>
              {title}
            </EmptyTitle>
          )}
          {showDescription && (
            <EmptyDescription id={descriptionId} className={cn('max-w-full wrap-anywhere', classNames?.description)}>
              {description}
            </EmptyDescription>
          )}
        </EmptyHeader>
      )}
      {(showActions || showChildren) && (
        <EmptyContent className={classNames?.content}>
          {showActions && (
            <div className={cn('flex max-w-full flex-wrap items-center justify-center gap-2', classNames?.actions)}>
              {actions}
            </div>
          )}
          {children}
        </EmptyContent>
      )}
    </Empty>
  )
}
