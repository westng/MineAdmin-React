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

/** The application supplies data and translation without coupling the component to its runtime. */
export interface MaDictionarySource {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => Readonly<Record<string, MaDictOption[]>>
  subscribeLocale: (listener: () => void) => () => void
  getLocaleSnapshot: () => string
  translate: (key: string, fallback?: string) => string
}
