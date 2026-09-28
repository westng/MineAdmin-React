import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import { Input } from '@/components/reui/primitives/input'
import { InputGroup, InputGroupAddon, InputGroupText } from '@/components/reui/primitives/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/reui/primitives/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
import { Switch } from '@/components/reui/primitives/switch'
import { Textarea } from '@/components/reui/primitives/textarea'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/reui/number-field'
import { cn } from '@/utils/cn'
import { FormDatePicker } from './form-date-picker'
import { FormTimePicker } from './form-time-picker'
import type { MaFormComponentName, MaFormControlPropsMap, MaFormItem, MaFormModel } from '../types'

interface FormControlProps<T extends MaFormModel> {
  item: MaFormItem<T>
  value: unknown
  disabled: boolean
  setValue: (value: unknown) => void
  id?: string
  ariaLabel?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

function getChoices(source: unknown): { value: unknown; label: React.ReactNode; disabled?: boolean }[] {
  if (source && typeof source === 'object' && !Array.isArray(source))
    return Object.entries(source).map(([value, label]) => ({ value, label: label as React.ReactNode }))
  if (!Array.isArray(source)) return []
  return source.flatMap(option => {
    if (option === null || option === undefined) return []
    if (typeof option !== 'object') return [{ value: option, label: String(option) }]
    if (Array.isArray(option.items)) return getChoices(option.items)
    return [
      {
        value: 'value' in option ? option.value : (option.id ?? option),
        label: option.label ?? option.name ?? option.title ?? String(option.value ?? option.id ?? ''),
        disabled: option.disabled,
      },
    ]
  })
}

function affix(control: React.ReactElement, prefix: React.ReactNode, suffix: React.ReactNode, disabled: boolean) {
  if (prefix === undefined && suffix === undefined) return control
  const { className } = control.props as { className?: string | ((state: unknown) => string) }
  const base = 'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0'
  const child = React.cloneElement(control as React.ReactElement<Record<string, unknown>>, {
    className: typeof className === 'function' ? (state: unknown) => cn(base, className(state)) : cn(base, className),
    'data-slot': 'input-group-control',
  })
  return (
    <InputGroup data-disabled={disabled}>
      {prefix !== undefined && (
        <InputGroupAddon>
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      {child}
      {suffix !== undefined && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

function ClearButton({
  className,
  onPointerDown,
  onClick,
}: {
  className?: string
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>
  onClick: React.MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <button
      type="button"
      aria-label="清除"
      title="清除"
      className={cn(
        'flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <XIcon className="size-3.5" aria-hidden="true" />
    </button>
  )
}

export function FormControl<T extends MaFormModel>({
  item,
  value,
  disabled,
  setValue,
  id,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
}: FormControlProps<T>): React.ReactNode {
  const rawProps = item.renderProps ?? {}
  const rawAccessibilityProps = rawProps as Record<string, unknown>
  const component = item.component ?? item.render ?? 'Input'
  const ariaLabelValue =
    typeof rawAccessibilityProps['aria-label'] === 'string'
      ? rawAccessibilityProps['aria-label']
      : component === 'DatePicker' || component === 'TimePicker'
        ? undefined
        : ariaLabel
  const accessibility = {
    id: typeof rawProps.id === 'string' ? rawProps.id : id,
    'aria-label': ariaLabelValue,
    'aria-invalid': Boolean(ariaInvalid || rawProps.invalid),
    'aria-describedby': ariaDescribedBy,
  }
  if (typeof component !== 'string') {
    const onChange = (rawProps as Record<string, unknown>).onChange as ((value: unknown) => void) | undefined
    return React.createElement(component as React.ComponentType<Record<string, unknown>>, {
      ...rawProps,
      ...accessibility,
      value,
      disabled,
      onChange: (next: unknown) => {
        onChange?.(next)
        setValue(next)
      },
    })
  }
  const { prefix, suffix, ...props } = rawProps as MaFormControlPropsMap[MaFormComponentName]
  delete props.invalid
  let control: React.ReactElement
  if (component === 'Select') {
    const {
      options,
      items,
      placeholder,
      clearable = true,
      triggerProps,
      valueProps,
      popupProps,
      itemProps,
      onValueChange,
      onChange,
      className,
      size,
      ...rootProps
    } = props as MaFormControlPropsMap['Select']
    const choices = getChoices(options ?? items)
    const canClear = Boolean(
      clearable &&
      !disabled &&
      (rootProps.multiple
        ? Array.isArray(value) && value.length > 0
        : value !== undefined && value !== null && value !== ''),
    )
    control = (
      <div className="relative w-full">
        <Select
          {...rootProps}
          items={items}
          value={rootProps.multiple ? (Array.isArray(value) ? value : []) : (value ?? null)}
          onValueChange={(next, details) => {
            onValueChange?.(next, details)
            if (details.isCanceled) return
            onChange?.(next)
            setValue(next)
          }}
          disabled={disabled}
        >
          <SelectTrigger
            size={size}
            {...triggerProps}
            {...accessibility}
            aria-label={rootProps['aria-label'] ?? triggerProps?.['aria-label'] ?? ariaLabel}
            className={state =>
              cn(
                'w-full',
                canClear && 'pr-8',
                typeof className === 'function' ? className(state) : className,
                typeof triggerProps?.className === 'function' ? triggerProps.className(state) : triggerProps?.className,
              )
            }
          >
            <SelectValue placeholder={placeholder ?? '请选择'} {...valueProps} />
          </SelectTrigger>
          <SelectContent {...popupProps}>
            {choices.map((option, index) => (
              <SelectItem
                {...itemProps}
                key={index}
                value={option.value}
                disabled={option.disabled || itemProps?.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canClear && (
          <ClearButton
            className="absolute top-1/2 right-7 z-10 size-5 -translate-y-1/2"
            onPointerDown={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              const next = rootProps.multiple ? [] : null
              onChange?.(next)
              setValue(next)
            }}
          />
        )}
      </div>
    )
  } else if (component === 'Checkbox') {
    const {
      clearable = true,
      onCheckedChange,
      placeholder,
      ...controlProps
    } = props as MaFormControlPropsMap['Checkbox']
    const canClear = Boolean(clearable && !disabled && value)
    control = (
      <div className="flex items-center gap-1">
        <Checkbox
          {...controlProps}
          {...accessibility}
          aria-label={controlProps['aria-label'] ?? ariaLabel ?? placeholder}
          checked={Boolean(value)}
          disabled={disabled}
          onCheckedChange={(checked, details) => {
            onCheckedChange?.(checked, details)
            if (!details.isCanceled) setValue(checked)
          }}
        />
        {canClear && <ClearButton onClick={() => setValue(false)} />}
      </div>
    )
  } else if (component === 'Switch') {
    const { clearable = true, onCheckedChange, placeholder, ...controlProps } = props as MaFormControlPropsMap['Switch']
    const canClear = Boolean(clearable && !disabled && value)
    control = (
      <div className="flex items-center gap-1">
        <Switch
          {...controlProps}
          {...accessibility}
          aria-label={controlProps['aria-label'] ?? ariaLabel ?? placeholder}
          checked={Boolean(value)}
          disabled={disabled}
          onCheckedChange={(checked, details) => {
            onCheckedChange?.(checked, details)
            if (!details.isCanceled) setValue(checked)
          }}
        />
        {canClear && <ClearButton onClick={() => setValue(false)} />}
      </div>
    )
  } else if (component === 'Radio') {
    const {
      clearable = true,
      options,
      items,
      itemProps,
      placeholder,
      onValueChange,
      ...rootProps
    } = props as MaFormControlPropsMap['Radio']
    const canClear = Boolean(clearable && !disabled && value !== undefined && value !== null && value !== '')
    control = (
      <div className="flex items-center gap-1">
        <RadioGroup
          {...rootProps}
          {...accessibility}
          aria-label={rootProps['aria-label'] ?? ariaLabel ?? placeholder}
          name={rootProps.name ?? id}
          value={value ?? null}
          disabled={disabled}
          onValueChange={(next, details) => {
            onValueChange?.(next, details)
            if (!details.isCanceled) setValue(next)
          }}
        >
          {getChoices(options ?? items).map((option, index) => (
            <label key={index} className="inline-flex items-center gap-2 text-sm">
              <RadioGroupItem
                {...itemProps}
                value={option.value}
                disabled={disabled || option.disabled || itemProps?.disabled}
              />
              {option.label}
            </label>
          ))}
        </RadioGroup>
        {canClear && <ClearButton onClick={() => setValue(undefined)} />}
      </div>
    )
  } else if (component === 'InputNumber') {
    const {
      controls = false,
      inputProps,
      groupProps,
      incrementProps,
      decrementProps,
      placeholder,
      clearable = true,
      onValueChange,
      onChange,
      ...rootProps
    } = props as MaFormControlPropsMap['InputNumber']
    const canClear = Boolean(clearable && !disabled && value !== undefined && value !== null && value !== '')
    control = (
      <NumberField
        {...rootProps}
        id={accessibility.id}
        value={typeof value === 'number' && Number.isFinite(value) ? value : null}
        disabled={disabled}
        onValueChange={(next, details) => {
          onValueChange?.(next, details)
          if (!details.isCanceled) setValue(next ?? undefined)
        }}
      >
        <NumberFieldGroup {...groupProps}>
          {controls && <NumberFieldDecrement aria-label="减少" {...decrementProps} />}
          <NumberFieldInput
            placeholder={placeholder}
            {...inputProps}
            {...accessibility}
            onChange={event => {
              inputProps?.onChange?.(event)
              onChange?.(event)
            }}
          />
          {canClear && <ClearButton className="size-6 shrink-0" onClick={() => setValue(undefined)} />}
          {controls && <NumberFieldIncrement aria-label="增加" {...incrementProps} />}
        </NumberFieldGroup>
      </NumberField>
    )
  } else if (component === 'DatePicker') {
    control = (
      <FormDatePicker
        {...(props as MaFormControlPropsMap['DatePicker'])}
        {...accessibility}
        value={value}
        setValue={setValue}
        disabled={disabled}
      />
    )
  } else if (component === 'TimePicker') {
    control = (
      <FormTimePicker
        {...(props as MaFormControlPropsMap['TimePicker'])}
        {...accessibility}
        value={value}
        setValue={setValue}
        disabled={disabled}
      />
    )
  } else if (component === 'Textarea') {
    const { clearable = true, onChange, ...controlProps } = props as MaFormControlPropsMap['Textarea']
    const canClear = Boolean(clearable && !disabled && value !== undefined && value !== null && value !== '')
    control = (
      <div className="relative w-full">
        <Textarea
          {...controlProps}
          {...accessibility}
          className={cn(canClear && 'pe-8', controlProps.className)}
          value={value == null ? '' : String(value)}
          disabled={disabled}
          onChange={event => {
            onChange?.(event)
            if (!event.defaultPrevented) setValue(event.target.value)
          }}
        />
        {canClear && <ClearButton className="absolute top-1 right-1" onClick={() => setValue('')} />}
      </div>
    )
  } else {
    const { clearable = true, onChange, ...controlProps } = props as MaFormControlPropsMap['Input']
    const canClear = Boolean(clearable && !disabled && value !== undefined && value !== null && value !== '')
    control = (
      <div className="relative w-full">
        <Input
          {...controlProps}
          {...accessibility}
          className={cn(canClear && 'pe-8', controlProps.className)}
          type={component === 'Password' ? 'password' : controlProps.type}
          value={value == null ? '' : String(value)}
          disabled={disabled}
          onChange={event => {
            onChange?.(event)
            if (!event.defaultPrevented) setValue(event.target.value)
          }}
        />
        {canClear && <ClearButton className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setValue('')} />}
      </div>
    )
  }
  return affix(control, prefix, suffix, disabled)
}
