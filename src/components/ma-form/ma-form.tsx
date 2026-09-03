import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getPathValue } from '../shared/path'
import { readLabel, resolveProp, setPathValue } from './utils'
import type { MaFormComponentName, MaFormExpose, MaFormItem, MaFormModel, MaFormOptions, MaFormProps, MaFormRenderContext, MaFormRule, MaFormValidationResult } from './types'

type MaModel = MaFormModel

interface MaFormControlProps<T extends MaModel = MaModel> {
  item: MaFormItem<T>
  value: unknown
  disabled: boolean
  setValue: (value: unknown) => void
}

function validateRule(rule: MaFormRule, value: unknown, model: MaModel): string | void | undefined | Promise<string | void> {
  const empty = value === undefined || value === null || value === ''
  if (rule.required && empty) return rule.message ?? '此项为必填项'
  if (empty) return undefined
  if (rule.type === 'email' && (typeof value !== 'string' || !/^\S+@\S+\.\S+$/.test(value))) {
    return rule.message ?? '请输入有效的邮箱地址'
  }
  if (rule.type === 'number' && typeof value !== 'number' && Number.isNaN(Number(value))) {
    return rule.message ?? '请输入数字'
  }
  if (rule.type === 'string' && typeof value !== 'string') return rule.message ?? '请输入文本'
  if (rule.min !== undefined && (typeof value === 'string' || Array.isArray(value)) && value.length < rule.min) {
    return rule.message ?? `长度不能少于 ${rule.min}`
  }
  if (rule.max !== undefined && (typeof value === 'string' || Array.isArray(value)) && value.length > rule.max) {
    return rule.message ?? `长度不能超过 ${rule.max}`
  }
  if (rule.pattern && (typeof value !== 'string' || !rule.pattern.test(value))) return rule.message ?? '格式不正确'
  return rule.validator?.(value, model)
}

function getColumnStyle<T extends MaModel>(item: MaFormItem<T>, columns: number): React.CSSProperties {
  const span = item.cols?.span
  const offset = item.cols?.offset ?? 0
  if (!span && columns === 1) return {}
  const safeSpan = Math.max(1, Math.min(columns, span ? Math.ceil((span / 24) * columns) : columns))
  const safeOffset = Math.max(0, Math.min(columns - safeSpan, offset ? Math.ceil((offset / 24) * columns) : 0))
  return { gridColumn: `span ${safeSpan} / span ${safeSpan}`, marginInlineStart: safeOffset ? `${(safeOffset / columns) * 100}%` : undefined }
}

function itemIsHidden<T extends MaModel>(item: MaFormItem<T>, model: T): boolean {
  return typeof item.hide === 'function' ? item.hide(item, model) : item.hide === true
}

function itemIsShown<T extends MaModel>(item: MaFormItem<T>, model: T): boolean {
  return typeof item.show === 'function' ? item.show(item, model) : item.show !== false
}

function renderSelectOptions(props: Record<string, unknown>): Array<{ label: string; value: string }> {
  const source = props.options ?? props.items
  if (!Array.isArray(source)) return []
  return source.map((option) => {
    if (typeof option === 'string' || typeof option === 'number') return { label: String(option), value: String(option) }
    const record = option as Record<string, unknown>
    return { label: String(record.label ?? record.name ?? record.title ?? record.value ?? ''), value: String(record.value ?? record.id ?? '') }
  }).filter(option => option.value !== '')
}

function renderBuiltInControl<T extends MaModel>({ item, value, disabled, setValue }: MaFormControlProps<T>): React.ReactNode {
  const rawComponent = item.component ?? item.render
  if (item.component && typeof item.component === 'function') {
    return React.createElement(item.component, { value, disabled, onChange: setValue, ...(item.renderProps ?? {}) })
  }
  const component = (typeof rawComponent === 'string' ? rawComponent : 'Input') as MaFormComponentName
  const renderProps = { ...(item.renderProps ?? {}) }
  const customOnChange = renderProps.onChange as ((event: React.ChangeEvent<HTMLInputElement>) => void) | undefined
  delete renderProps.options
  delete renderProps.items
  delete renderProps.onChange
  const inputProps = renderProps as React.ComponentProps<typeof Input>
  const updateInput = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    customOnChange?.(event as React.ChangeEvent<HTMLInputElement>)
    setValue(event.target.value)
  }
  if (component === 'Select') {
    const options = renderSelectOptions(item.renderProps ?? {})
    return (
      <Select value={value === undefined || value === null ? '' : String(value)} onValueChange={nextValue => setValue(nextValue)} disabled={disabled}>
        <SelectTrigger className="w-full" {...(renderProps as React.ComponentProps<typeof SelectTrigger>)}><SelectValue placeholder={String(renderProps.placeholder ?? '请选择')} /></SelectTrigger>
        <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    )
  }
  if (component === 'Checkbox' || component === 'Switch') {
    return <Checkbox checked={Boolean(value)} onCheckedChange={checked => setValue(checked === true)} disabled={disabled} {...(renderProps as React.ComponentProps<typeof Checkbox>)} />
  }
  if (component === 'Textarea') return <Textarea value={value == null ? '' : String(value)} onChange={updateInput} disabled={disabled} {...(renderProps as React.ComponentProps<typeof Textarea>)} />
  if (component === 'InputNumber') return <Input type="number" value={value == null ? '' : String(value)} onChange={event => { updateInput(event); setValue(event.target.value === '' ? undefined : Number(event.target.value)) }} disabled={disabled} {...inputProps} />
  if (component === 'Password') return <Input type="password" value={value == null ? '' : String(value)} onChange={updateInput} disabled={disabled} {...inputProps} />
  return <Input value={value == null ? '' : String(value)} onChange={updateInput} disabled={disabled} {...inputProps} />
}

function MaFormInner<T extends MaModel>({ modelValue, defaultValue, items: initialItems = [], options: initialOptions = {}, className, children, footer, onModelValueChange, onChange, onSubmit }: MaFormProps<T>, ref: React.ForwardedRef<MaFormExpose<T>>) {
  const [internalValues, setInternalValues] = React.useState<T>({ ...(defaultValue ?? {}), ...(modelValue ?? {}) } as T)
  const [items, setItemsState] = React.useState<MaFormItem<T>[]>(initialItems)
  const [options, setOptionsState] = React.useState<MaFormOptions>(initialOptions)
  const [loadingState, setLoading] = React.useState(initialOptions.loading ?? false)
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const formElementRef = React.useRef<HTMLFormElement>(null)
  const initialValuesRef = React.useRef<T>({ ...(defaultValue ?? {}), ...(modelValue ?? {}) } as T)
  const values = modelValue ?? internalValues
  const loading = loadingState || Boolean(options.loading)

  const emitValues = React.useCallback((nextValues: T) => {
    setInternalValues(nextValues)
    onModelValueChange?.(nextValues)
    onChange?.(nextValues)
  }, [onChange, onModelValueChange])

  const setValue = React.useCallback((prop: string, value: unknown) => {
    emitValues(setPathValue(values, prop, value))
  }, [emitValues, values])

  const getRulesForItem = React.useCallback((item: MaFormItem<T>) => {
    const prop = resolveProp(item.prop, values)
    const itemRules = item.itemProps?.rules
    const optionRules = prop ? options.rules?.[prop] : undefined
    const rules = itemRules ?? optionRules
    return !rules ? [] : Array.isArray(rules) ? rules : [rules]
  }, [options.rules, values])

  const validate = React.useCallback(async (): Promise<MaFormValidationResult> => {
    const nextErrors: Record<string, string[]> = {}
    for (const item of items) {
      const prop = resolveProp(item.prop, values)
      if (!prop || !itemIsShown(item, values) || itemIsHidden(item, values)) continue
      const rules = getRulesForItem(item)
      for (const rule of rules) {
        const result = await validateRule(rule, getPathValue(values, prop), values)
        if (typeof result === 'string') {
          nextErrors[prop] = [...(nextErrors[prop] ?? []), result]
          break
        }
      }
    }
    setErrors(nextErrors)
    return { valid: Object.keys(nextErrors).length === 0, errors: nextErrors }
  }, [getRulesForItem, items, values])

  const validateField = React.useCallback(async (prop: string) => {
    const item = items.find(candidate => resolveProp(candidate.prop, values) === prop)
    if (!item) return true
    const fieldErrors: string[] = []
    for (const rule of getRulesForItem(item)) {
      const result = await validateRule(rule, getPathValue(values, prop), values)
      if (typeof result === 'string') {
        fieldErrors.push(result)
        break
      }
    }
    setErrors(current => {
      const next = { ...current }
      if (fieldErrors.length) next[prop] = fieldErrors
      else delete next[prop]
      return next
    })
    return fieldErrors.length === 0
  }, [getRulesForItem, items, values])

  const resetFields = React.useCallback((props?: string[]) => {
    const targetProps = props ?? items.map(item => resolveProp(item.prop, values)).filter((prop): prop is string => Boolean(prop))
    let nextValues = values
    targetProps.forEach(prop => { nextValues = setPathValue(nextValues, prop, getPathValue(initialValuesRef.current, prop)) })
    emitValues(nextValues)
    setErrors(current => {
      const next = { ...current }
      targetProps.forEach(prop => { delete next[prop] })
      return next
    })
  }, [emitValues, items, values])

  const clearValidate = React.useCallback((props?: string[]) => {
    if (!props) return setErrors({})
    setErrors(current => {
      const next = { ...current }
      props.forEach(prop => delete next[prop])
      return next
    })
  }, [])

  const setValues = React.useCallback((nextValues: Partial<T> | null) => {
    emitValues(nextValues === null ? {} as T : { ...values, ...nextValues })
  }, [emitValues, values])

  React.useImperativeHandle(ref, () => ({
    validate,
    validateField,
    resetFields,
    clearValidate,
    setValues,
    getValues: () => values,
    setLoadingState: setLoading,
    setOptions: (nextOptions) => setOptionsState(current => ({ ...current, ...nextOptions })),
    getOptions: () => options,
    setItems: setItemsState,
    getItems: () => items,
    appendItem: item => setItemsState(current => [...current, item]),
    removeItem: prop => setItemsState(current => current.filter(item => resolveProp(item.prop, values) !== prop)),
    getItemByProp: prop => items.find(item => resolveProp(item.prop, values) === prop) ?? null,
    getElFormRef: () => formElementRef.current,
  }), [clearValidate, items, options, resetFields, setValues, validate, validateField, values])

  const columns = options.grid?.columns ?? (options.inline ? 4 : 1)
  const layoutStyle: React.CSSProperties = options.layout === 'grid' || columns > 1
    ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: options.grid?.gap ?? options.flex?.gap ?? '1rem', alignItems: options.grid?.alignment }
    : { gap: options.flex?.gap ?? '1rem' }

  return (
    <form ref={formElementRef} className={cn('relative w-full', options.containerClass, className)} onSubmit={event => { event.preventDefault(); void onSubmit?.(values) }}>
      <FieldGroup className={cn(options.layout === 'grid' || columns > 1 ? 'grid' : 'flex', options.inline && 'items-end')} style={layoutStyle}>
        {items.map((item, itemIndex) => {
          const prop = resolveProp(item.prop, values)
          if (!itemIsShown(item, values)) return null
          const hidden = itemIsHidden(item, values)
          const value = prop ? getPathValue(values, prop) : undefined
          const context: MaFormRenderContext<T> = { item, formData: values, value, setValue: nextValue => { if (prop) setValue(prop, nextValue) } }
          const label = item.itemSlots?.label?.(context) ?? readLabel(item.label)
          const itemProps = item.itemProps ?? {}
          const fieldError = prop ? errors[prop] : undefined
          const rendered = item.render && typeof item.render === 'function'
            ? React.createElement(item.render as React.ComponentType<MaFormRenderContext<T>>, context)
            : renderBuiltInControl({ item, value, disabled: Boolean(options.disabled || loading || item.renderProps?.disabled), setValue: context.setValue })
          return (
            <Field key={`${prop ?? 'item'}-${itemIndex}`} data-invalid={Boolean(fieldError?.length)} className={cn(itemProps.className, hidden && 'hidden')} style={getColumnStyle(item, columns)}>
              {label !== undefined && label !== null && <FieldLabel className={itemProps.labelClassName} htmlFor={prop}>{label}{(itemProps.required || getRulesForItem(item).some(rule => rule.required)) && <span className="text-destructive">*</span>}</FieldLabel>}
              <FieldContent>
                {React.isValidElement(rendered) ? React.cloneElement(rendered, { id: prop, 'aria-invalid': Boolean(fieldError?.length) } as Record<string, unknown>) : rendered}
                {itemProps.help && <FieldDescription>{itemProps.help}</FieldDescription>}
                {item.itemSlots?.help?.(context)}
                {itemProps.extra && <FieldDescription>{itemProps.extra}</FieldDescription>}
                {item.itemSlots?.extra?.(context)}
                {itemProps.showMessage !== false && <FieldError errors={fieldError?.map(message => ({ message }))} />}
                {item.itemSlots?.error?.(context)}
              </FieldContent>
              {item.children?.map((child, childIndex) => <MaFormItemChildren key={`${prop ?? itemIndex}-child-${childIndex}`} item={child} formData={values} setValue={context.setValue} />)}
            </Field>
          )
        })}
      </FieldGroup>
      {children}
      {footer ?? (typeof options.footerSlot === 'function' ? options.footerSlot() : options.footerSlot)}
      {loading && <div className="pointer-events-none absolute inset-0 rounded-lg bg-background/50" aria-hidden="true"><div className="flex h-full items-center justify-center"><Button type="button" variant="outline" size="sm" disabled>加载中…</Button></div></div>}
    </form>
  )
}

function MaFormItemChildren<T extends MaModel>({ item, formData, setValue }: { item: MaFormItem<T>; formData: T; setValue: (value: unknown) => void }) {
  const prop = resolveProp(item.prop, formData)
  const context: MaFormRenderContext<T> = { item, formData, value: prop ? getPathValue(formData, prop) : undefined, setValue }
  return item.render && typeof item.render === 'function' ? React.createElement(item.render as React.ComponentType<MaFormRenderContext<T>>, context) : null
}

export const MaForm = React.forwardRef(MaFormInner) as <T extends MaModel = MaModel>(props: MaFormProps<T> & { ref?: React.ForwardedRef<MaFormExpose<T>> }) => React.ReactElement
