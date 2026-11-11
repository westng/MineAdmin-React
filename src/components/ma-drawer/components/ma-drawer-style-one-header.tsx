import { useContext } from 'react'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/reui/primitives/sheet'
import { cn } from '@/utils/cn'
import { MaDrawerHeaderContext } from '../context/header-context'
import type { MaDrawerHeaderProps } from '../types'

function hasContent(value: MaDrawerHeaderProps['title']) {
  return value !== undefined && value !== null && value !== false && value !== true && value !== ''
}

export function MaDrawerStyleOneHeader({
  title,
  description,
  meta,
  metaExtra,
  titleExtra,
  descriptionIcon,
  actions,
  toolbar,
  bottom,
  className,
}: Extract<MaDrawerHeaderProps, { variant: 'style-1' }>) {
  const { showCloseButton } = useContext(MaDrawerHeaderContext)
  const hasTopRow = hasContent(meta) || hasContent(metaExtra) || hasContent(actions)
  const closeSpace = showCloseButton && 'pr-9'

  return (
    <div data-slot="ma-drawer-header" data-variant="style-1" className="@container/ma-drawer-header min-w-0 shrink-0">
      <SheetHeader className={cn('gap-3 border-b p-0 px-[var(--ma-drawer-padding-x,1.25rem)] pt-3 pb-4', className)}>
        {hasTopRow && (
          <div
            data-slot="ma-drawer-header-top"
            className={cn(
              'flex min-h-7 min-w-0 flex-wrap items-center gap-x-2 gap-y-2 @min-[24rem]/ma-drawer-header:gap-x-3',
              closeSpace,
            )}
          >
            {(hasContent(meta) || hasContent(metaExtra)) && (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {hasContent(meta) && (
                  <div
                    data-slot="ma-drawer-header-meta"
                    className="min-w-0 truncate text-xs text-muted-foreground"
                    title={typeof meta === 'string' ? meta : undefined}
                  >
                    {meta}
                  </div>
                )}
                {hasContent(metaExtra) && (
                  <div data-slot="ma-drawer-header-meta-extra" className="flex shrink-0 items-center gap-1">
                    {metaExtra}
                  </div>
                )}
              </div>
            )}
            {hasContent(actions) && (
              <div
                data-slot="ma-drawer-header-actions"
                className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1"
              >
                {actions}
              </div>
            )}
          </div>
        )}
        <div className="space-y-2">
          <div className={cn('flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1.5', !hasTopRow && closeSpace)}>
            <SheetTitle
              className={cn('min-w-0 max-w-full leading-6 [overflow-wrap:anywhere]', !hasContent(title) && 'sr-only')}
            >
              {hasContent(title) ? title : '抽屉'}
            </SheetTitle>
            {hasContent(titleExtra) && (
              <div data-slot="ma-drawer-header-title-extra" className="flex max-w-full flex-wrap items-start gap-1.5">
                {titleExtra}
              </div>
            )}
          </div>
          {hasContent(description) && (
            <SheetDescription render={<div />} className="flex min-w-0 items-start gap-1.5 text-xs leading-5">
              {hasContent(descriptionIcon) && (
                <span aria-hidden="true" className="mt-0.5 flex shrink-0 items-center [&>svg]:size-3.5">
                  {descriptionIcon}
                </span>
              )}
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">{description}</div>
            </SheetDescription>
          )}
        </div>
        {hasContent(toolbar) && (
          <div data-slot="ma-drawer-header-toolbar" className="flex min-w-0 flex-wrap items-center gap-2">
            {toolbar}
          </div>
        )}
      </SheetHeader>
      {hasContent(bottom) && (
        <div
          data-slot="ma-drawer-header-bottom"
          className={cn(
            'min-w-0 border-b px-[var(--ma-drawer-padding-x,1.25rem)]',
            '[&>[data-slot=tabs-list][data-variant=line][data-orientation=horizontal]]:flex',
            '[&>[data-slot=tabs-list][data-variant=line][data-orientation=horizontal]]:py-0',
            '[&>[data-slot=tabs-list][data-variant=line][data-orientation=horizontal]>[data-slot=tabs-trigger]]:h-full',
            // 跨过按钮的 1px 透明边框与扩展区的 1px 分隔线，让选中线贴齐底边。
            '[&>[data-slot=tabs-list][data-variant=line][data-orientation=horizontal]>[data-slot=tabs-trigger]]:after:-bottom-0.5',
          )}
        >
          {bottom}
        </div>
      )}
    </div>
  )
}
