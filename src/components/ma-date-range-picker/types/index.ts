import type { AriaAttributes, ComponentProps, ReactNode } from 'react'
import type { Calendar } from '@/components/reui/primitives/calendar'
import type { Button } from '@/components/reui/primitives/button'
import type { PopoverContent } from '@/components/reui/primitives/popover'

export type MaDateRangeShortcut = {
  label: ReactNode
  getValue: () => unknown
}

type CalendarProps = Omit<ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect' | 'required'> & {
  min?: number
}

export type MaDateRangePickerProps = {
  value: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  className?: string
  id?: string
  valueFormat?: string | 'date'
  displayFormat?: string
  shortcuts?: readonly MaDateRangeShortcut[]
  calendarProps?: CalendarProps
  popupProps?: ComponentProps<typeof PopoverContent>
  triggerProps?: ComponentProps<typeof Button>
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
}
