import {
  CascaderContent,
  CascaderEmpty,
  CascaderList,
  CascaderPanel,
  CascaderTrigger,
} from '@/components/reui/cascader/cascader'
import { CascaderInput, CascaderNav, CascaderValue } from '@/components/reui/cascader/cascader-nav'
import { CascaderItems } from '@/components/reui/cascader/cascader-item'
import { cn } from '@/utils/cn'
import type { MaTreeSelectBaseProps } from '../types'

export function TreeSelectContent({
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
  className,
  contentClassName,
}: Pick<
  MaTreeSelectBaseProps<unknown>,
  'placeholder' | 'searchPlaceholder' | 'emptyText' | 'ariaLabel' | 'className' | 'contentClassName'
>) {
  return (
    <>
      <CascaderTrigger
        aria-label={ariaLabel ?? (typeof placeholder === 'string' ? placeholder : '树形选择')}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 [&>span]:line-clamp-1 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5',
          className,
        )}
      >
        <CascaderValue placeholder={placeholder} />
      </CascaderTrigger>
      <CascaderContent className={cn('min-w-[min(24rem,calc(100vw-2rem))]', contentClassName)}>
        <CascaderPanel>
          <CascaderNav>
            <CascaderInput placeholder={searchPlaceholder} />
          </CascaderNav>
          <CascaderEmpty>{emptyText}</CascaderEmpty>
          <CascaderList>
            <CascaderItems />
          </CascaderList>
        </CascaderPanel>
      </CascaderContent>
    </>
  )
}
