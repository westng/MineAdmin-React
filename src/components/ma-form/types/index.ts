import type * as React from 'react'
import type { MaModel } from '../../shared/types'

export type MaFormModel = MaModel

export type MaFormComponentName =
  | 'Input'
  | 'Password'
  | 'InputNumber'
  | 'Textarea'
  | 'Select'
  | 'Checkbox'
  | 'Switch'
  | 'DatePicker'
  | 'TimePicker'
  | 'Radio'

export interface MaFormRule {
  required?: boolean
  message?: string
  type?: 'string' | 'number' | 'email'
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (value: unknown, model: MaFormModel) => string | void | Promise<string | void>
}

export interface MaFormItemProps {
  required?: boolean
  rules?: MaFormRule | MaFormRule[]
  help?: React.ReactNode
  extra?: React.ReactNode
  className?: string
  labelClassName?: string
  showMessage?: boolean
  [key: string]: unknown
}

export interface MaFormRenderContext<T extends MaFormModel = MaFormModel> {
  item: MaFormItem<T>
  formData: T
  value: unknown
  setValue: (value: unknown) => void
}

export type MaFormRender<T extends MaFormModel = MaFormModel> = (context: MaFormRenderContext<T>) => React.ReactNode

export interface MaFormItem<T extends MaFormModel = MaFormModel> {
  label?: string | (() => string) | React.ReactNode
  showLabel?: boolean
  prop?: string | ((model: T) => string)
  hide?: boolean | ((item: MaFormItem<T>, model: T) => boolean)
  show?: boolean | ((item: MaFormItem<T>, model: T) => boolean)
  cols?: { span?: number; offset?: number; xs?: number; sm?: number; md?: number; lg?: number; xl?: number }
  itemProps?: MaFormItemProps
  itemSlots?: {
    label?: (context: MaFormRenderContext<T>) => React.ReactNode
    help?: (context: MaFormRenderContext<T>) => React.ReactNode
    extra?: (context: MaFormRenderContext<T>) => React.ReactNode
    error?: (context: MaFormRenderContext<T>) => React.ReactNode
  }
  render?: MaFormRender<T> | MaFormComponentName | React.ComponentType<MaFormRenderContext<T>>
  component?: MaFormComponentName | React.ComponentType<Record<string, unknown>>
  renderProps?: Record<string, unknown>
  children?: MaFormItem<T>[]
}

export interface MaFormOptions {
  loading?: boolean
  containerClass?: string
  layout?: 'flex' | 'grid'
  grid?: { columns?: number; gap?: number | string; className?: string; alignment?: React.CSSProperties['alignItems'] }
  flex?: { gap?: number | string; justify?: React.CSSProperties['justifyContent']; align?: React.CSSProperties['alignItems'] }
  footerSlot?: React.ReactNode | (() => React.ReactNode)
  inline?: boolean
  labelPosition?: 'left' | 'right' | 'top'
  labelWidth?: string | number
  labelSuffix?: string
  disabled?: boolean
  rules?: Record<string, MaFormRule | MaFormRule[]>
  className?: string
}

export interface MaFormValidationResult {
  valid: boolean
  errors: Record<string, string[]>
}

export interface MaFormExpose<T extends MaFormModel = MaFormModel> {
  validate: () => Promise<MaFormValidationResult>
  validateField: (prop: string) => Promise<boolean>
  resetFields: (props?: string[]) => T
  clearValidate: (props?: string[]) => void
  setValues: (values: Partial<T> | null) => void
  getValues: () => T
  setLoadingState: (loading: boolean) => void
  setOptions: (options: MaFormOptions) => void
  getOptions: () => MaFormOptions
  setItems: (items: MaFormItem<T>[]) => void
  getItems: () => MaFormItem<T>[]
  appendItem: (item: MaFormItem<T>) => void
  removeItem: (prop: string) => void
  getItemByProp: (prop: string) => MaFormItem<T> | null
  getElFormRef: () => HTMLFormElement | null
}

export interface MaFormProps<T extends MaFormModel = MaFormModel> {
  modelValue?: T
  defaultValue?: Partial<T>
  items?: MaFormItem<T>[]
  options?: MaFormOptions
  className?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  onModelValueChange?: (value: T) => void
  onChange?: (value: T) => void
  onSubmit?: (value: T) => void | Promise<void>
}
