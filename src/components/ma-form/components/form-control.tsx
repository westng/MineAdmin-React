import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupText } from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from '@/components/reui/number-field'
import { cn } from '@/lib/utils'
import { FormDatePicker } from './form-date-picker'
import { FormTimePicker } from './form-time-picker'
import type { MaFormComponentName, MaFormControlPropsMap, MaFormItem, MaFormModel } from '../types'

interface FormControlProps<T extends MaFormModel> {
  item: MaFormItem<T>
  value: unknown
  disabled: boolean
  setValue: (value: unknown) => void
  id?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
}

function getChoices(source: unknown): { value: unknown; label: React.ReactNode; disabled?: boolean }[] {
  if (source && typeof source === 'object' && !Array.isArray(source)) return Object.entries(source).map(([value, label]) => ({ value, label: label as React.ReactNode }))
  if (!Array.isArray(source)) return []
  return source.flatMap(option => {
    if (option === null || option === undefined) return []
    if (typeof option !== 'object') return [{ value: option, label: String(option) }]
    if (Array.isArray(option.items)) return getChoices(option.items)
    return [{ value: 'value' in option ? option.value : option.id ?? option, label: option.label ?? option.name ?? option.title ?? String(option.value ?? option.id ?? ''), disabled: option.disabled }]
  })
}

function affix(control: React.ReactElement, prefix: React.ReactNode, suffix: React.ReactNode, disabled: boolean) {
  if (prefix === undefined && suffix === undefined) return control
  const { className } = control.props as { className?: string | ((state: unknown) => string) }
  const base = 'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0'
  const child = React.cloneElement(control as React.ReactElement<Record<string, unknown>>, { className: typeof className === 'function' ? (state: unknown) => cn(base, className(state)) : cn(base, className), 'data-slot': 'input-group-control' })
  return <InputGroup data-disabled={disabled}>
    {prefix !== undefined && <InputGroupAddon><InputGroupText>{prefix}</InputGroupText></InputGroupAddon>}
    {child}
    {suffix !== undefined && <InputGroupAddon align="inline-end"><InputGroupText>{suffix}</InputGroupText></InputGroupAddon>}
  </InputGroup>
}

export function FormControl<T extends MaFormModel>({ item, value, disabled, setValue, id, ariaInvalid, ariaDescribedBy }: FormControlProps<T>): React.ReactNode {
  const rawProps = item.renderProps ?? {}
  const component = item.component ?? item.render ?? 'Input'
  const accessibility = { id: typeof rawProps.id === 'string' ? rawProps.id : id, 'aria-invalid': Boolean(ariaInvalid || rawProps.invalid), 'aria-describedby': ariaDescribedBy }
  if (typeof component !== 'string') {
    const onChange = (rawProps as Record<string, unknown>).onChange as ((value: unknown) => void) | undefined
    return React.createElement(component as React.ComponentType<Record<string, unknown>>, { ...rawProps, ...accessibility, value, disabled, onChange: (next: unknown) => { onChange?.(next); setValue(next) } })
  }
  const { prefix, suffix, ...props } = rawProps as MaFormControlPropsMap[MaFormComponentName]
  delete props.invalid
  let control: React.ReactElement
  if (component === 'Select') {
    const { options, items, placeholder, triggerProps, valueProps, popupProps, itemProps, onValueChange, onChange, className, size, ...rootProps } = props as MaFormControlPropsMap['Select']
    const choices = getChoices(options ?? items)
    control = <Select {...rootProps} items={items} value={rootProps.multiple ? Array.isArray(value) ? value : [] : value ?? null} onValueChange={(next, details) => {
      onValueChange?.(next, details)
      if (details.isCanceled) return
      onChange?.(next)
      setValue(next)
    }} disabled={disabled}>
      <SelectTrigger size={size} {...triggerProps} {...accessibility} aria-label={rootProps['aria-label'] ?? triggerProps?.['aria-label']} className={state => cn('w-full', typeof className === 'function' ? className(state) : className, typeof triggerProps?.className === 'function' ? triggerProps.className(state) : triggerProps?.className)}><SelectValue placeholder={placeholder ?? '请选择'} {...valueProps} /></SelectTrigger>
      <SelectContent {...popupProps}>{choices.map((option, index) => <SelectItem {...itemProps} key={index} value={option.value} disabled={option.disabled || itemProps?.disabled}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  } else if (component === 'Checkbox') {
    const { onCheckedChange, placeholder, ...controlProps } = props as MaFormControlPropsMap['Checkbox']
    control = <Checkbox {...controlProps} {...accessibility} aria-label={controlProps['aria-label'] ?? placeholder} checked={Boolean(value)} disabled={disabled} onCheckedChange={(checked, details) => { onCheckedChange?.(checked, details); if (!details.isCanceled) setValue(checked) }} />
  } else if (component === 'Switch') {
    const { onCheckedChange, placeholder, ...controlProps } = props as MaFormControlPropsMap['Switch']
    control = <Switch {...controlProps} {...accessibility} aria-label={controlProps['aria-label'] ?? placeholder} checked={Boolean(value)} disabled={disabled} onCheckedChange={(checked, details) => { onCheckedChange?.(checked, details); if (!details.isCanceled) setValue(checked) }} />
  } else if (component === 'Radio') {
    const { options, items, itemProps, placeholder, onValueChange, ...rootProps } = props as MaFormControlPropsMap['Radio']
    control = <RadioGroup {...rootProps} {...accessibility} aria-label={rootProps['aria-label'] ?? placeholder} name={rootProps.name ?? id} value={value} disabled={disabled} onValueChange={(next, details) => { onValueChange?.(next, details); if (!details.isCanceled) setValue(next) }}>
      {getChoices(options ?? items).map((option, index) => <label key={index} className="inline-flex items-center gap-2 text-sm"><RadioGroupItem {...itemProps} value={option.value} disabled={disabled || option.disabled || itemProps?.disabled} />{option.label}</label>)}
    </RadioGroup>
  } else if (component === 'InputNumber') {
    const { controls = true, inputProps, groupProps, incrementProps, decrementProps, placeholder, onValueChange, onChange, ...rootProps } = props as MaFormControlPropsMap['InputNumber']
    control = <NumberField {...rootProps} id={accessibility.id} value={typeof value === 'number' && Number.isFinite(value) ? value : null} disabled={disabled} onValueChange={(next, details) => { onValueChange?.(next, details); if (!details.isCanceled) setValue(next ?? undefined) }}>
      <NumberFieldGroup {...groupProps}>
        {controls && <NumberFieldDecrement aria-label="减少" {...decrementProps} />}
        <NumberFieldInput placeholder={placeholder} {...inputProps} {...accessibility} onChange={event => { inputProps?.onChange?.(event); onChange?.(event) }} />
        {controls && <NumberFieldIncrement aria-label="增加" {...incrementProps} />}
      </NumberFieldGroup>
    </NumberField>
  } else if (component === 'DatePicker') {
    control = <FormDatePicker {...props as MaFormControlPropsMap['DatePicker']} {...accessibility} value={value} setValue={setValue} disabled={disabled} />
  } else if (component === 'TimePicker') {
    control = <FormTimePicker {...props as MaFormControlPropsMap['TimePicker']} {...accessibility} value={value} setValue={setValue} disabled={disabled} />
  } else if (component === 'Textarea') {
    const { onChange, ...controlProps } = props as MaFormControlPropsMap['Textarea']
    control = <Textarea {...controlProps} {...accessibility} value={value == null ? '' : String(value)} disabled={disabled} onChange={event => { onChange?.(event); if (!event.defaultPrevented) setValue(event.target.value) }} />
  } else {
    const { onChange, ...controlProps } = props as MaFormControlPropsMap['Input']
    control = <Input {...controlProps} {...accessibility} type={component === 'Password' ? 'password' : controlProps.type} value={value == null ? '' : String(value)} disabled={disabled} onChange={event => { onChange?.(event); if (!event.defaultPrevented) setValue(event.target.value) }} />
  }
  return affix(control, prefix, suffix, disabled)
}
