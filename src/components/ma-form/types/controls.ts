import type * as React from 'react'
import type { Select as SelectPrimitive } from '@base-ui/react/select'
import type { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import type { Input } from '@/components/ui/input'
import type { Textarea } from '@/components/ui/textarea'
import type { Checkbox } from '@/components/ui/checkbox'
import type { Switch } from '@/components/ui/switch'
import type { RadioGroupItem } from '@/components/ui/radio-group'
import type { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NumberField, NumberFieldGroup, NumberFieldInput, NumberFieldIncrement, NumberFieldDecrement } from '@/components/reui/number-field'
import type { Button } from '@/components/ui/button'
import type { Calendar } from '@/components/ui/calendar'
import type { Popover, PopoverContent } from '@/components/ui/popover'

export interface MaFormControlDecoration {
  invalid?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  placeholder?: string
  options?: never
}

export type MaFormChoiceOption = string | number | boolean | {
  value?: unknown
  id?: string | number
  label?: React.ReactNode
  name?: string
  title?: string
  disabled?: boolean
}

export type MaFormInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'defaultValue'> & MaFormControlDecoration
export type MaFormTextareaProps = Omit<React.ComponentProps<typeof Textarea>, 'value' | 'defaultValue'> & MaFormControlDecoration
export type MaFormCheckboxProps = Omit<React.ComponentProps<typeof Checkbox>, 'checked' | 'defaultChecked'> & MaFormControlDecoration
export type MaFormSwitchProps = Omit<React.ComponentProps<typeof Switch>, 'checked' | 'defaultChecked'> & MaFormControlDecoration

export type MaFormSelectProps = Omit<SelectPrimitive.Root.Props<unknown, boolean>, 'value' | 'defaultValue' | 'children'> & Omit<MaFormControlDecoration, 'options'> & {
  options?: MaFormChoiceOption[]
  className?: React.ComponentProps<typeof SelectTrigger>['className']
  size?: React.ComponentProps<typeof SelectTrigger>['size']
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  onChange?: (value: unknown) => void
  triggerProps?: React.ComponentProps<typeof SelectTrigger>
  valueProps?: React.ComponentProps<typeof SelectValue>
  popupProps?: React.ComponentProps<typeof SelectContent>
  itemProps?: Omit<React.ComponentProps<typeof SelectItem>, 'value' | 'children'>
}

export type MaFormRadioProps = Omit<RadioGroupPrimitive.Props<unknown>, 'value' | 'defaultValue' | 'children'> & Omit<MaFormControlDecoration, 'options'> & {
  options?: MaFormChoiceOption[]
  items?: MaFormChoiceOption[]
  itemProps?: Omit<React.ComponentProps<typeof RadioGroupItem>, 'value' | 'children'>
}

export type MaFormInputNumberProps = Omit<React.ComponentProps<typeof NumberField>, 'value' | 'defaultValue' | 'children'> & MaFormControlDecoration & {
  controls?: boolean
  inputProps?: React.ComponentProps<typeof NumberFieldInput>
  groupProps?: React.ComponentProps<typeof NumberFieldGroup>
  incrementProps?: React.ComponentProps<typeof NumberFieldIncrement>
  decrementProps?: React.ComponentProps<typeof NumberFieldDecrement>
  /** 兼容原生输入监听；数值和原因请使用 onValueChange。 */
  onChange?: React.ChangeEventHandler<HTMLInputElement>
}

export type MaFormDatePickerProps = MaFormControlDecoration & {
  id?: string
  name?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  mode?: 'single' | 'multiple' | 'range'
  valueFormat?: string | 'date'
  displayFormat?: string
  /** 兼容原日期输入的上下限，字符串格式与 valueFormat 一致。 */
  min?: string | Date
  max?: string | Date
  onValueChange?: (value: unknown) => void
  calendarProps?: Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect' | 'required'>
  popoverProps?: Omit<React.ComponentProps<typeof Popover>, 'children'>
  popupProps?: React.ComponentProps<typeof PopoverContent>
  triggerProps?: React.ComponentProps<typeof Button>
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
}

export type MaFormTimePartProps = Omit<SelectPrimitive.Root.Props<string, false>, 'children' | 'value' | 'defaultValue' | 'multiple'> & {
  triggerProps?: React.ComponentProps<typeof SelectTrigger>
  popupProps?: React.ComponentProps<typeof SelectContent>
}

export type MaFormTimePickerProps = MaFormControlDecoration & {
  id?: string
  name?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  showSeconds?: boolean
  minuteStep?: number
  secondStep?: number
  onValueChange?: (value: string, details: SelectPrimitive.Root.ChangeEventDetails) => void
  hourProps?: MaFormTimePartProps
  minuteProps?: MaFormTimePartProps
  secondProps?: MaFormTimePartProps
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
}

export interface MaFormControlPropsMap {
  Input: MaFormInputProps
  Password: MaFormInputProps
  Textarea: MaFormTextareaProps
  Select: MaFormSelectProps
  Checkbox: MaFormCheckboxProps
  Switch: MaFormSwitchProps
  Radio: MaFormRadioProps
  InputNumber: MaFormInputNumberProps
  DatePicker: MaFormDatePickerProps
  TimePicker: MaFormTimePickerProps
}
