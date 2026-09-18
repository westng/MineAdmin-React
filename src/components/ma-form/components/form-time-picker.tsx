import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
import { cn } from '@/utils/cn'
import type { MaFormTimePickerProps, MaFormTimePartProps } from '../types'

export function FormTimePicker({
  value,
  setValue,
  ...props
}: MaFormTimePickerProps & { value: unknown; setValue: (value: unknown) => void }) {
  const parts = typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value) ? value.split(':') : []
  const fields: { label: string; max: number; step?: number; props?: MaFormTimePartProps }[] = [
    { label: '时', max: 24, props: props.hourProps },
    { label: '分', max: 60, step: props.minuteStep, props: props.minuteProps },
    ...(props.showSeconds ? [{ label: '秒', max: 60, step: props.secondStep, props: props.secondProps }] : []),
  ]
  return (
    <div
      role="group"
      aria-label={props['aria-label'] ?? props.placeholder ?? '选择时间'}
      className={cn('flex w-full items-center gap-1', props.className)}
    >
      {fields.map((field, index) => {
        const { triggerProps, popupProps, onValueChange, ...rootProps } = field.props ?? {}
        const step = Number.isInteger(field.step) && field.step! > 0 && field.step! < field.max ? field.step! : 1
        const choices = Array.from({ length: Math.ceil(field.max / step) }, (_, number) =>
          String(number * step).padStart(2, '0'),
        )
        return (
          <Select
            key={field.label}
            {...rootProps}
            value={parts[index] ?? null}
            disabled={props.disabled || rootProps.disabled}
            readOnly={props.readOnly || rootProps.readOnly}
            onValueChange={(next, details) => {
              onValueChange?.(next, details)
              if (next === null || details.isCanceled) return
              const updated = fields
                .map((_, partIndex) => (partIndex === index ? next : (parts[partIndex] ?? '00')))
                .join(':')
              props.onValueChange?.(updated, details)
              if (!details.isCanceled) setValue(updated)
            }}
          >
            <SelectTrigger
              {...triggerProps}
              id={index === 0 ? props.id : props.id ? `${props.id}-${index}` : undefined}
              aria-label={`${props['aria-label'] ?? ''}${field.label}`}
              aria-invalid={props['aria-invalid']}
              aria-describedby={props['aria-describedby']}
              className={state =>
                cn(
                  'min-w-0 flex-1',
                  typeof triggerProps?.className === 'function'
                    ? triggerProps.className(state)
                    : triggerProps?.className,
                )
              }
            >
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent {...popupProps}>
              {choices.map(choice => (
                <SelectItem key={choice} value={choice}>
                  {choice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      })}
      {props.name && <input type="hidden" name={props.name} value={String(value ?? '')} />}
    </div>
  )
}
