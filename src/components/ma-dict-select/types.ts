import type * as React from 'react'
import type { Select as SelectPrimitive } from '@base-ui/react/select'
import type { SelectContent, SelectItem, SelectTrigger } from '@/components/reui/primitives/select'

export interface MaDictOption {
  label: string
  value: string | number
  i18n?: string
  color?: string
  [key: string]: unknown
}

export type MaDictSelectValue = MaDictOption['value']

export type MaDictSelectProps = Omit<
  SelectPrimitive.Root.Props<string, false>,
  'children' | 'items' | 'value' | 'defaultValue' | 'onValueChange'
> & {
  dictName: string
  value?: MaDictSelectValue | null
  defaultValue?: MaDictSelectValue | null
  onChange?: (value: MaDictSelectValue | null) => void
  onValueChange?: (value: MaDictSelectValue | null) => void
  clearable?: boolean
  placeholder?: React.ReactNode
  triggerProps?: React.ComponentProps<typeof SelectTrigger>
  contentProps?: Omit<React.ComponentProps<typeof SelectContent>, 'children'>
  itemProps?: Omit<React.ComponentProps<typeof SelectItem>, 'value' | 'children'>
}
