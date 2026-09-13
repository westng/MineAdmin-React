import type { ReactNode } from 'react'
import type { BadgeProps } from '@/components/reui/badge'
import type { Dictionary } from '@/provider/dictionary'

export type BadgeCellValue = string | number | boolean

interface BadgeCellContent {
  leading?: ReactNode
  trailing?: ReactNode
  dot?: boolean
}

/** 单个选项的标签、插槽及 ReUI Badge 原生属性。 */
export interface BadgeCellOption extends Omit<BadgeProps, 'children'>, BadgeCellContent {
  value: BadgeCellValue
  label?: ReactNode
}

export interface BadgeCellProps extends Omit<BadgeProps, 'children'>, BadgeCellContent {
  /** 支持单值或数组；空值与不支持的数据类型显示 emptyText。 */
  value: unknown
  /** 字典分类的 code，例如 system-status；由统一字典仓库提供数据。 */
  dictName?: string
  /** 直接提供选项数组；传入时优先于 dictName，空数组也视为显式配置。 */
  options?: readonly BadgeCellOption[]
  /** 字典模式下按字典项定制展示属性。 */
  optionProps?: (option: Readonly<Dictionary>) => Omit<BadgeCellOption, 'value'>
  formatValue?: (value: BadgeCellValue) => ReactNode
  emptyText?: ReactNode
  containerClassName?: string
}

export type BadgeCellOptions = Omit<BadgeCellProps, 'value'>

export interface BadgeCellItem extends BadgeCellContent {
  key: string
  label: ReactNode
  badgeProps: Omit<BadgeProps, 'children'>
}

export interface BadgeCellView {
  items: BadgeCellItem[]
  emptyText: ReactNode
  containerClassName?: string
}
