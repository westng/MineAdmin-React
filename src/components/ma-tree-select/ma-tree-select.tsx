import type { ReactNode } from 'react'
import {
  Cascader,
  CascaderContent,
  CascaderEmpty,
  CascaderList,
  CascaderPanel,
  CascaderTrigger,
} from '@/components/reui/cascader/cascader'
import { CascaderInput, CascaderNav, CascaderValue } from '@/components/reui/cascader/cascader-nav'
import { CascaderItems } from '@/components/reui/cascader/cascader-item'
import type { CascaderChangeDetails, CascaderNode, CascaderSelectable } from '@/components/reui/cascader/cascader-types'
import { cn } from '@/utils/cn'

type MaTreeSelectBaseProps<T> = {
  items: CascaderNode<T>[]
  rootOption?: CascaderNode<T>
  excludeValues?: readonly (string | number)[]
  placeholder?: ReactNode
  searchPlaceholder?: string
  emptyText?: ReactNode
  ariaLabel?: string
  maxHeight?: number | string
  selectable?: CascaderSelectable<T>
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  id?: string
  className?: string
  contentClassName?: string
}

export type MaTreeSelectSingleProps<T = unknown> = MaTreeSelectBaseProps<T> & {
  multiple?: false
  value?: string | number | null
  onValueChange?: (value: string, details: CascaderChangeDetails<T>) => void
  max?: never
  cascade?: never
}

export type MaTreeSelectMultipleProps<T = unknown> = MaTreeSelectBaseProps<T> & {
  multiple: true
  value?: readonly (string | number)[]
  onValueChange?: (value: string[], details: CascaderChangeDetails<T>) => void
  max?: number
  cascade?: boolean
}

export type MaTreeSelectProps<T = unknown> = MaTreeSelectSingleProps<T> | MaTreeSelectMultipleProps<T>

function removeExcludedNodes<T>(items: CascaderNode<T>[], excluded: Set<string>): CascaderNode<T>[] {
  return items.flatMap(item => {
    if (excluded.has(item.value)) return []
    return [{ ...item, children: item.children ? removeExcludedNodes(item.children, excluded) : undefined }]
  })
}

function TreeSelectContent({
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

export function MaTreeSelect<T>(props: MaTreeSelectProps<T>) {
  const {
    items,
    rootOption,
    excludeValues = [],
    placeholder = '请选择',
    searchPlaceholder = '搜索',
    emptyText = '未找到选项',
    ariaLabel,
    maxHeight = 240,
    selectable = 'any',
    disabled,
    readOnly,
    required,
    invalid,
    name,
    id,
    className,
    contentClassName,
  } = props
  const excluded = new Set(excludeValues.map(item => String(item)))
  const treeItems = removeExcludedNodes(rootOption ? [rootOption, ...items] : items, excluded)
  const content = (
    <TreeSelectContent
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      ariaLabel={ariaLabel}
      className={className}
      contentClassName={contentClassName}
    />
  )

  if (props.multiple) {
    return (
      <Cascader<T>
        mode="tree"
        multiple
        items={treeItems}
        selectable={selectable}
        cascade={props.cascade}
        max={props.max}
        value={(props.value ?? []).map(item => String(item))}
        onValueChange={props.onValueChange}
        maxHeight={maxHeight}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        invalid={invalid}
        name={name}
        id={id}
      >
        {content}
      </Cascader>
    )
  }

  return (
    <Cascader<T>
      mode="tree"
      items={treeItems}
      selectable={selectable}
      value={props.value == null ? '' : String(props.value)}
      onValueChange={props.onValueChange}
      maxHeight={maxHeight}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      invalid={invalid}
      name={name}
      id={id}
    >
      {content}
    </Cascader>
  )
}
