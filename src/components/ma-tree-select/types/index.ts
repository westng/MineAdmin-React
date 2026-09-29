import type { ReactNode } from 'react'
import type { CascaderChangeDetails, CascaderNode, CascaderSelectable } from '@/components/reui/cascader/cascader-types'

export type MaTreeSelectBaseProps<T> = {
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
