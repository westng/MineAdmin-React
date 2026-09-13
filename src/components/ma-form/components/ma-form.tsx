import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { FormControl } from './form-control'
import { getPathValue } from '../../shared/path'
import { usePropState } from '../../shared/use-prop-state'
import { readLabel, resolveProp, setPathValue } from '../utils/form-utils'
import type { MaFormExpose, MaFormItem, MaFormModel, MaFormOptions, MaFormProps, MaFormRenderContext, MaFormRule, MaFormValidationResult } from '../types'

type MaModel = MaFormModel
const emptyItems: MaFormItem[] = []
const emptyOptions: MaFormOptions = {}

function validateRule(rule: MaFormRule, value: unknown, model: MaModel): string | void | undefined | Promise<string | void> {
  const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')
  if (rule.required && empty) return rule.message ?? '此项为必填项'
  if (empty) return undefined
  if (rule.type === 'email' && (typeof value !== 'string' || !/^\S+@\S+\.\S+$/.test(value))) {
    return rule.message ?? '请输入有效的邮箱地址'
  }
  if (rule.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
    return rule.message ?? '请输入数字'
  }
  if (rule.type === 'string' && typeof value !== 'string') return rule.message ?? '请输入文本'
  if (rule.min !== undefined) {
    const belowMinimum = typeof value === 'number' ? value < rule.min : (typeof value === 'string' || Array.isArray(value)) && value.length < rule.min
    if (belowMinimum) return rule.message ?? (typeof value === 'number' ? `数值不能小于 ${rule.min}` : `长度不能少于 ${rule.min}`)
  }
  if (rule.max !== undefined) {
    const aboveMaximum = typeof value === 'number' ? value > rule.max : (typeof value === 'string' || Array.isArray(value)) && value.length > rule.max
    if (aboveMaximum) return rule.message ?? (typeof value === 'number' ? `数值不能大于 ${rule.max}` : `长度不能超过 ${rule.max}`)
  }
  if (rule.pattern) {
    rule.pattern.lastIndex = 0
    const matched = typeof value === 'string' && rule.pattern.test(value)
    rule.pattern.lastIndex = 0
    if (!matched) return rule.message ?? '格式不正确'
  }
  return rule.validator?.(value, model)
}

async function runValidationRule(rule: MaFormRule, value: unknown, model: MaModel): Promise<string | void> {
  try {
    return await validateRule(rule, value, model)
  } catch (error) {
    return error instanceof Error && error.message ? error.message : '校验失败'
  }
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

function MaFormInner<T extends MaModel>({ modelValue, defaultValue, items: initialItems = emptyItems as MaFormItem<T>[], options: initialOptions = emptyOptions, className, children, footer, onModelValueChange, onChange, onSubmit }: MaFormProps<T>, ref: React.ForwardedRef<MaFormExpose<T>>) {
  const [internalValues, setInternalValues] = React.useState<T>({ ...(defaultValue ?? {}), ...(modelValue ?? {}) } as T)
  const [items, setItemsState] = usePropState(initialItems)
  const [options, setOptionsState] = usePropState(initialOptions)
  const [loading, setLoading] = usePropState(Boolean(options.loading))
  const [errors, setErrors] = React.useState<Record<string, string[]>>({})
  const formElementRef = React.useRef<HTMLFormElement>(null)
  const initialValuesRef = React.useRef<T>({ ...(defaultValue ?? {}), ...(modelValue ?? {}) } as T)
  const values = modelValue ?? internalValues

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
        const result = await runValidationRule(rule, getPathValue(values, prop), values)
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
    if (!itemIsShown(item, values) || itemIsHidden(item, values)) {
      setErrors(current => {
        if (!(prop in current)) return current
        const next = { ...current }
        delete next[prop]
        return next
      })
      return true
    }
    const fieldErrors: string[] = []
    for (const rule of getRulesForItem(item)) {
      const result = await runValidationRule(rule, getPathValue(values, prop), values)
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
    return nextValues
  }, [emitValues, items, values])

  const clearValidate = React.useCallback((props?: string[]) => {
    if (!props) return setErrors({})
    setErrors(current => {
      const next = { ...current }
      props.forEach(prop => delete next[prop])
      return next
    })
  }, [])

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await validate()
    if (!result.valid) {
      const firstErrorProp = Object.keys(result.errors)[0]
      if (firstErrorProp) {
        const control = Array.from(formElementRef.current?.elements ?? []).find(element => (element as HTMLElement).id === firstErrorProp) as HTMLElement | undefined
        control?.focus()
      }
      return
    }
    await onSubmit?.(values)
  }, [onSubmit, validate, values])

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
  }), [clearValidate, items, options, resetFields, setItemsState, setLoading, setOptionsState, setValues, validate, validateField, values])

  const columns = options.grid?.columns ?? (options.inline ? 4 : 1)
  const layoutStyle: React.CSSProperties = options.layout === 'grid' || columns > 1
    ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: options.grid?.gap ?? options.flex?.gap ?? '1rem', alignItems: options.grid?.alignment }
    : { gap: options.flex?.gap ?? '1rem' }

  return (
    <form ref={formElementRef} className={cn('relative w-full', options.containerClass, className)} onSubmit={event => { void handleSubmit(event) }}>
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
          const errorId = prop ? `${prop.replace(/[^a-zA-Z0-9_-]/g, '-')}-error` : undefined
          const labelPosition = options.labelPosition ?? 'top'
          const horizontalLabel = labelPosition === 'left' || labelPosition === 'right'
          const labelWidth = typeof options.labelWidth === 'number' ? `${options.labelWidth}px` : options.labelWidth
          const rendered = item.render && typeof item.render === 'function'
            ? React.createElement(item.render as React.ComponentType<MaFormRenderContext<T>>, context)
            : <FormControl item={item} value={value} disabled={Boolean(options.disabled || loading || item.renderProps?.disabled)} setValue={context.setValue} id={prop} ariaInvalid={Boolean(fieldError?.length)} ariaDescribedBy={fieldError?.length ? errorId : undefined} />
          return (
            <Field key={`${prop ?? 'item'}-${itemIndex}`} data-invalid={Boolean(fieldError?.length)} className={cn(itemProps.className, hidden && 'hidden')} orientation={horizontalLabel ? 'horizontal' : 'vertical'} style={getColumnStyle(item, columns)}>
              {item.showLabel !== false && label !== undefined && label !== null && <FieldLabel className={itemProps.labelClassName} htmlFor={prop} style={horizontalLabel && labelWidth ? { width: labelWidth, flex: `0 0 ${labelWidth}`, textAlign: labelPosition === 'right' ? 'right' : undefined } : undefined}>{label}{options.labelSuffix ?? ''}{(itemProps.required || getRulesForItem(item).some(rule => rule.required)) && <span className="text-destructive">*</span>}</FieldLabel>}
              <FieldContent>
                {typeof item.render === 'function' && React.isValidElement(rendered) ? React.cloneElement(rendered, { id: prop, 'aria-invalid': Boolean(fieldError?.length), 'aria-describedby': fieldError?.length ? errorId : undefined } as Record<string, unknown>) : rendered}
                {itemProps.help && <FieldDescription>{itemProps.help}</FieldDescription>}
                {item.itemSlots?.help?.(context)}
                {itemProps.extra && <FieldDescription>{itemProps.extra}</FieldDescription>}
                {item.itemSlots?.extra?.(context)}
                {itemProps.showMessage !== false && <FieldError id={errorId} errors={fieldError?.map(message => ({ message }))} />}
                {item.itemSlots?.error?.(context)}
              </FieldContent>
              {item.children?.map((child, childIndex) => <MaFormItemChildren key={`${prop ?? itemIndex}-child-${childIndex}`} item={child} formData={values} setFieldValue={setValue} />)}
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

function MaFormItemChildren<T extends MaModel>({ item, formData, setFieldValue }: { item: MaFormItem<T>; formData: T; setFieldValue: (prop: string, value: unknown) => void }) {
  const prop = resolveProp(item.prop, formData)
  const context: MaFormRenderContext<T> = { item, formData, value: prop ? getPathValue(formData, prop) : undefined, setValue: value => { if (prop) setFieldValue(prop, value) } }
  return item.render && typeof item.render === 'function' ? React.createElement(item.render as React.ComponentType<MaFormRenderContext<T>>, context) : null
}

export const MaForm = React.forwardRef(MaFormInner) as <T extends MaModel = MaModel>(props: MaFormProps<T> & { ref?: React.ForwardedRef<MaFormExpose<T>> }) => React.ReactElement
