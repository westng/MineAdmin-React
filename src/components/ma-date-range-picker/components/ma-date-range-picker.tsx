import { useState, type ComponentType } from 'react'
import { endOfDay, format, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { Calendar } from '@/components/reui/primitives/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/reui/primitives/popover'
import { cn } from '@/utils/cn'
import type { MaDateRangePickerProps } from '../types'
import { readDate, writeDate } from '../utils/date-range-utils'
import { defaultDateRangeShortcuts } from '../data/shortcuts'

export function MaDateRangePicker({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  placeholder = '请选择时间范围',
  className,
  id,
  valueFormat = 'yyyy-MM-dd HH:mm:ss',
  displayFormat = 'yyyy-MM-dd HH:mm',
  shortcuts = defaultDateRangeShortcuts,
  calendarProps,
  popupProps,
  triggerProps,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: MaDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const values = Array.isArray(value) ? value : []
  const from = readDate(values[0], valueFormat)
  const to = readDate(values[1], valueFormat)
  const display = [from, to]
    .filter((date): date is Date => Boolean(date))
    .map(date => format(date, displayFormat))
    .join(' — ')

  function updateRange(range: DateRange | undefined) {
    if (!range?.from) {
      onChange?.(undefined)
      return
    }
    const next = [
      writeDate(startOfDay(range.from), valueFormat),
      range.to ? writeDate(endOfDay(range.to), valueFormat) : undefined,
    ]
    onChange?.(next)
    if (range.to) setOpen(false)
  }

  function clearValue() {
    onChange?.(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              {...triggerProps}
              id={id}
              disabled={disabled || readOnly || triggerProps?.disabled}
              className={cn(
                'w-full justify-start pe-9 font-normal',
                !display && 'text-muted-foreground',
                className,
                triggerProps?.className,
              )}
              aria-label={ariaLabel ?? placeholder}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
            />
          }
        >
          <CalendarIcon aria-hidden="true" />
          {display || placeholder}
        </PopoverTrigger>
        {display && !disabled && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute end-1 top-1/2 z-10 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="清除时间范围"
            title="清除时间范围"
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              clearValue()
            }}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      <PopoverContent
        align="start"
        {...popupProps}
        className={cn('w-auto max-w-[calc(100vw-2rem)] overflow-visible p-0', popupProps?.className)}
      >
        <div className="flex max-h-[min(520px,calc(100vh-2rem))] flex-row overflow-auto">
          <aside className="flex w-28 shrink-0 flex-col gap-1 border-e p-2">
            {shortcuts.map((shortcut, index) => (
              <Button
                key={`${index}-${String(shortcut.label)}`}
                type="button"
                size="sm"
                variant="ghost"
                className="justify-start whitespace-nowrap"
                disabled={disabled || readOnly}
                onClick={() => {
                  onChange?.(shortcut.getValue())
                  setOpen(false)
                }}
              >
                {shortcut.label}
              </Button>
            ))}
          </aside>
          <div className="p-2">
            <Calendar
              {...calendarProps}
              locale={calendarProps?.locale ?? zhCN}
              numberOfMonths={calendarProps?.numberOfMonths ?? 2}
              mode="range"
              min={calendarProps?.min ?? 1}
              resetOnSelect
              selected={from ? { from, to } : undefined}
              disabled={disabled || readOnly || calendarProps?.disabled}
              onSelect={updateRange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const MaDateRangePickerField: ComponentType<Record<string, unknown>> = props => (
  <MaDateRangePicker {...(props as MaDateRangePickerProps)} />
)
