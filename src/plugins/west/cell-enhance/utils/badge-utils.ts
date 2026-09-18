import type { BadgeProps } from '@/components/reui/badge'
import { cn } from '@/utils/cn'
import type { Dictionary } from '@/provider/dictionary'
import { dictionaryBadgeVariants } from '../config/badge'
import type { BadgeCellOption, BadgeCellProps, BadgeCellValue, BadgeCellView } from '../types'
import { findOptionByValue } from './option-utils'

export function isBadgeValue(value: unknown): value is BadgeCellValue {
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'boolean'
}

export function badgeValues(value: unknown): BadgeCellValue[] {
  return (Array.isArray(value) ? value : [value]).filter(isBadgeValue)
}

function dictionaryColorProps(color: Dictionary['color']): Pick<BadgeProps, 'variant' | 'style'> {
  const name = typeof color === 'string' ? color.trim() : ''
  if (!name) return {}
  const variant = dictionaryBadgeVariants.get(name)
  if (variant) return { variant }
  return { variant: 'outline', style: { color: name, borderColor: name } }
}

function resolveBadgeOption(option: Dictionary | undefined, optionProps: BadgeCellProps['optionProps']): BadgeCellOption | undefined {
  if (!option) return undefined
  const colorProps = dictionaryColorProps(option.color)
  const customProps = optionProps?.(option)

  return {
    label: typeof option.label === 'string' ? option.label : undefined,
    ...colorProps,
    ...customProps,
    value: option.value,
    style: colorProps.style || customProps?.style ? { ...colorProps.style, ...customProps?.style } : undefined,
  }
}

/** 集中处理取值、映射、插槽与样式合并，组件只负责展示。 */
export function resolveBadgeCell({
  value,
  options,
  optionProps,
  formatValue,
  emptyText = '-',
  containerClassName,
  leading,
  trailing,
  dot = false,
  className,
  style,
  ...badgeProps
}: Omit<BadgeCellProps, 'dictName'>, dictionary: readonly Dictionary[]): BadgeCellView {
  return {
    emptyText,
    containerClassName,
    items: badgeValues(value).map((item, index) => {
      const option = options !== undefined
        ? findOptionByValue(options, item)
        : resolveBadgeOption(findOptionByValue(dictionary, item), optionProps)
      const {
        value: optionValue,
        label,
        leading: optionLeading = leading,
        trailing: optionTrailing = trailing,
        dot: optionDot = dot,
        className: optionClassName,
        style: optionStyle,
        ...itemProps
      } = option ?? {}

      return {
        key: typeof item + ':' + String(optionValue ?? item) + ':' + index,
        label: label !== undefined ? label : formatValue ? formatValue(item) : String(item),
        leading: optionLeading,
        trailing: optionTrailing,
        dot: optionDot,
        badgeProps: {
          ...badgeProps,
          ...itemProps,
          className: cn(className, optionClassName),
          style: style || optionStyle ? { ...style, ...optionStyle } : undefined,
        },
      }
    }),
  }
}
