import { useImperativeHandle, useRef } from 'react'
import type { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { format, isValid, parse } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Calendar } from '@/components/reui/primitives/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/reui/primitives/popover'
import { cn } from '@/utils/cn'
import type { MaFormDatePickerProps } from '../types'

export function FormDatePicker({
  value,
  setValue,
  ...props
}: MaFormDatePickerProps & { value: unknown; setValue: (value: unknown) => void }) {
  const {
    id,
    disabled,
    readOnly,
    className,
    placeholder = '请选择日期',
    mode = 'single',
    valueFormat = 'yyyy-MM-dd',
    displayFormat = 'yyyy-MM-dd',
    calendarProps,
    popoverProps,
    popupProps,
    triggerProps,
    onValueChange,
  } = props
  const actionsRef = useRef<PopoverPrimitive.Root.Actions>(null)
  useImperativeHandle(
    popoverProps?.actionsRef,
    () => ({ close: () => actionsRef.current?.close(), unmount: () => actionsRef.current?.unmount() }),
    [],
  )
  const toDate = (entry: unknown): Date | undefined => {
    const parsed =
      entry instanceof Date
        ? entry
        : typeof entry === 'string' && entry
          ? parse(entry, valueFormat === 'date' ? 'yyyy-MM-dd' : valueFormat, new Date())
          : undefined
    return parsed && isValid(parsed) ? parsed : undefined
  }
  const toValue = (date?: Date) => (date ? (valueFormat === 'date' ? date : format(date, valueFormat)) : undefined)
  const dates = (Array.isArray(value) ? value : [value]).map(toDate)
  const minimum = toDate(props.min)
  const maximum = toDate(props.max)
  const disabledDays =
    disabled || readOnly
      ? true
      : [
          ...(Array.isArray(calendarProps?.disabled)
            ? calendarProps.disabled
            : calendarProps?.disabled
              ? [calendarProps.disabled]
              : []),
          ...(minimum ? [{ before: minimum }] : []),
          ...(maximum ? [{ after: maximum }] : []),
        ]
  const display = dates
    .filter((date): date is Date => Boolean(date))
    .map(date => format(date, displayFormat))
    .join(mode === 'range' ? ' — ' : '、')
  const update = (next: Date | Date[] | DateRange | undefined) => {
    let result: unknown
    let complete = mode === 'single'
    if (mode === 'range') {
      const range = next as DateRange | undefined
      result = range ? [toValue(range.from), toValue(range.to)] : undefined
      complete = Boolean(range?.to)
    } else result = Array.isArray(next) ? next.map(toValue) : toValue(next as Date | undefined)
    onValueChange?.(result)
    setValue(result)
    if (complete) actionsRef.current?.close()
  }
  const calendar =
    mode === 'range' ? (
      <Calendar
        {...calendarProps}
        disabled={disabledDays}
        mode="range"
        selected={dates[0] ? { from: dates[0], to: dates[1] } : undefined}
        onSelect={update}
      />
    ) : mode === 'multiple' ? (
      <Calendar
        {...calendarProps}
        disabled={disabledDays}
        mode="multiple"
        selected={dates.filter((date): date is Date => Boolean(date))}
        onSelect={update}
      />
    ) : (
      <Calendar {...calendarProps} disabled={disabledDays} mode="single" selected={dates[0]} onSelect={update} />
    )

  return (
    <Popover {...popoverProps} actionsRef={actionsRef}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            {...triggerProps}
            id={id}
            disabled={disabled || readOnly || triggerProps?.disabled}
            className={cn(
              'w-full justify-start font-normal',
              !display && 'text-muted-foreground',
              className,
              triggerProps?.className,
            )}
            aria-label={props['aria-label'] ?? placeholder}
            aria-invalid={props['aria-invalid']}
            aria-describedby={props['aria-describedby']}
          >
            <CalendarIcon aria-hidden="true" />
            {display || placeholder}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0" {...popupProps}>
        {calendar}
      </PopoverContent>
      {props.name && (
        <input
          type="hidden"
          name={props.name}
          value={
            Array.isArray(value)
              ? value.map(entry => (entry instanceof Date ? format(entry, 'yyyy-MM-dd') : (entry ?? ''))).join(',')
              : value instanceof Date
                ? format(value, 'yyyy-MM-dd')
                : String(value ?? '')
          }
        />
      )}
    </Popover>
  )
}
