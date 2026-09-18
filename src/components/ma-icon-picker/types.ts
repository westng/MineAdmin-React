import type { ComponentProps } from 'react'

export type MaIconPickerProps = Pick<
  ComponentProps<'input'>,
  | 'id'
  | 'name'
  | 'ref'
  | 'disabled'
  | 'readOnly'
  | 'required'
  | 'onBlur'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
> & {
  value?: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  pageSize?: number
}

export type MaIconPanelProps = {
  value: string
  onSelect: (value: string) => void
  pageSize?: number
  disabled?: boolean
}
