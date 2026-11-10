"use client"

import type { ChangeEvent, ComponentProps, SetStateAction } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useId,
} from "react"
import {
  addMonths,
  format,
  isBefore,
  isSameMonth,
  parse,
  subMonths,
} from "date-fns"
import type { DateRange, DayButton } from "react-day-picker"

import { useIsMobile } from "@/hooks/ui/use-mobile"
import { cn } from "@/utils/cn"
import { Button } from "@/components/reui/primitives/button"
import { Calendar, CalendarDayButton } from "@/components/reui/primitives/calendar"
import { Input } from "@/components/reui/primitives/input"
import { ScrollArea } from "@/components/reui/primitives/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/reui/primitives/tabs"
import { CornerUpLeftIcon, CornerUpRightIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

export interface DateSelectorI18nConfig {
  // Labels
  selectDate: string
  apply: string
  cancel: string
  clear: string
  today: string
  // Filter types
  filterTypes: {
    is: string
    before: string
    after: string
    between: string
  }
  // Period types
  periodTypes: {
    day: string
    month: string
    quarter: string
    halfYear: string
    year: string
  }
  // Months
  months: string[]
  monthsShort: string[]
  // Quarters
  quarters: string[]
  // Half years
  halfYears: string[]
  // Weekdays
  weekdays: string[]
  weekdaysShort: string[]
  // Placeholders
  placeholder: string
  rangePlaceholder: string
  invalidInput?: string
}

export const DEFAULT_DATE_SELECTOR_I18N: DateSelectorI18nConfig = {
  selectDate: "Select date",
  apply: "Apply",
  cancel: "Cancel",
  clear: "Clear",
  today: "Today",
  filterTypes: {
    is: "is",
    before: "before",
    after: "after",
    between: "between",
  },
  periodTypes: {
    day: "Day",
    month: "Month",
    quarter: "Quarter",
    halfYear: "Half-year",
    year: "Year",
  },
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthsShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  quarters: ["Q1", "Q2", "Q3", "Q4"],
  halfYears: ["H1", "H2"],
  weekdays: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  weekdaysShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  placeholder: "Select date...",
  rangePlaceholder: "Select date range...",
  invalidInput: "Enter a valid date.",
}

export type DateSelectorPeriodType =
  | "day"
  | "month"
  | "quarter"
  | "half-year"
  | "year"
export type DateSelectorFilterType = "is" | "before" | "after" | "between"

export interface DateSelectorValue {
  period: DateSelectorPeriodType
  operator: DateSelectorFilterType
  startDate?: Date
  endDate?: Date
  year?: number
  month?: number
  quarter?: number
  halfYear?: number
  rangeStart?: { year: number; value: number }
  rangeEnd?: { year: number; value: number }
}

export interface DateSelectorContextValue {
  i18n: DateSelectorI18nConfig
  variant: "outline" | "default"
  size: "sm" | "default" | "lg"
}

const DateSelectorContext = createContext<DateSelectorContextValue>({
  i18n: DEFAULT_DATE_SELECTOR_I18N,
  variant: "outline",
  size: "default",
})

export const useDateSelectorContext = () => useContext(DateSelectorContext)

export function formatDateValue(
  value: DateSelectorValue,
  i18n: DateSelectorI18nConfig = DEFAULT_DATE_SELECTOR_I18N,
  dayDateFormat: string = "MM/dd/yyyy"
): string {
  const {
    period,
    startDate,
    endDate,
    year,
    month,
    quarter,
    halfYear,
    rangeStart,
    rangeEnd,
  } = value

  if (period === "day") {
    if (startDate && endDate) {
      return `${format(startDate, dayDateFormat)} - ${format(endDate, dayDateFormat)}`
    }
    if (startDate) {
      return format(startDate, dayDateFormat)
    }
    return ""
  }

  if (period === "month") {
    if (rangeStart && rangeEnd) {
      return `${i18n.monthsShort[rangeStart.value]} ${rangeStart.year} - ${i18n.monthsShort[rangeEnd.value]} ${rangeEnd.year}`
    }
    if (year !== undefined && month !== undefined) {
      return `${i18n.monthsShort[month]} ${year}`
    }
    return ""
  }

  if (period === "quarter") {
    if (rangeStart && rangeEnd) {
      return `${i18n.quarters[rangeStart.value]} ${rangeStart.year} - ${i18n.quarters[rangeEnd.value]} ${rangeEnd.year}`
    }
    if (year !== undefined && quarter !== undefined) {
      return `${i18n.quarters[quarter]} ${year}`
    }
    return ""
  }

  if (period === "half-year") {
    if (rangeStart && rangeEnd) {
      return `${i18n.halfYears[rangeStart.value]} ${rangeStart.year} - ${i18n.halfYears[rangeEnd.value]} ${rangeEnd.year}`
    }
    if (year !== undefined && halfYear !== undefined) {
      return `${i18n.halfYears[halfYear]} ${year}`
    }
    return ""
  }

  if (period === "year") {
    if (rangeStart && rangeEnd) {
      return `${rangeStart.year} - ${rangeEnd.year}`
    }
    if (year !== undefined) {
      return `${year}`
    }
    return ""
  }

  return ""
}

interface UseDateSelectorOptions {
  value?: DateSelectorValue
  onChange?: (value: DateSelectorValue) => void
  defaultPeriodType?: DateSelectorPeriodType
  defaultFilterType?: DateSelectorFilterType
  presetMode?: DateSelectorFilterType
  allowRange?: boolean
  yearRange?: number
  baseYear?: number
  minYear?: number
  maxYear?: number
  periodTypes?: DateSelectorPeriodType[]
}

export function useDateSelector({
  value,
  onChange,
  defaultPeriodType = "day",
  defaultFilterType = "is",
  presetMode,
  allowRange = true,
  yearRange = 11,
  baseYear,
  minYear,
  maxYear,
  periodTypes,
}: UseDateSelectorOptions) {
  const currentYear = baseYear ?? new Date().getFullYear()
  const validDefaultPeriodType = periodTypes?.length && !periodTypes.includes(defaultPeriodType)
    ? periodTypes[0] : defaultPeriodType
  const [internalValue, setInternalValue] = useState<DateSelectorValue>(() => ({
    period: validDefaultPeriodType,
    operator: presetMode ?? defaultFilterType,
  }))
  const selected = value ?? internalValue
  const periodType = selected.period ?? validDefaultPeriodType
  const filterType = presetMode ?? selected.operator ?? defaultFilterType
  const currentValue = useMemo(() => ({ ...selected, period: periodType, operator: filterType }), [selected, periodType, filterType])
  const {
    startDate: selectedDate, endDate: selectedEndDate, year: selectedYear,
    month: selectedMonth, quarter: selectedQuarter, halfYear: selectedHalfYear,
    rangeStart, rangeEnd,
  } = currentValue
  const [calendarMonth, setCalendarMonth] = useState(value?.startDate ?? new Date())
  const [hoverDate, setHoverDate] = useState<Date | undefined>()
  const startTime = value?.startDate?.getTime()
  useEffect(() => {
    if (startTime !== undefined) setCalendarMonth(new Date(startTime))
  }, [startTime])

  const years = useMemo(() => {
    const count = Number.isFinite(yearRange) ? Math.max(1, Math.floor(yearRange)) : 11
    const defaultFirst = currentYear - Math.floor(count / 2)
    const first = minYear ?? defaultFirst
    const last = maxYear ?? defaultFirst + count - 1
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index)
  }, [currentYear, yearRange, minYear, maxYear])

  const selectValue = useCallback((next: DateSelectorValue) => {
    const normalized = { ...next, operator: presetMode ?? next.operator }
    if (value === undefined) {
      setInternalValue(normalized)
      if (normalized.startDate) setCalendarMonth(normalized.startDate)
    }
    onChange?.(normalized)
  }, [value, presetMode, onChange])

  const clearSelection = useCallback(() => {
    selectValue({ period: periodType, operator: filterType })
  }, [selectValue, periodType, filterType])

  const handleDayClick = useCallback((day: Date) => {
    let startDate = day
    let endDate: Date | undefined
    if (filterType === "between" && allowRange && selectedDate && !selectedEndDate) {
      startDate = isBefore(day, selectedDate) ? day : selectedDate
      endDate = isBefore(day, selectedDate) ? selectedDate : day
    }
    selectValue({ ...currentValue, startDate, endDate })
  }, [filterType, allowRange, selectedDate, selectedEndDate, selectValue, currentValue])

  const handlePeriodSelect = useCallback((year: number, item: number) => {
    const next: DateSelectorValue = { ...currentValue, year }
    if (periodType === "month") next.month = item
    if (periodType === "quarter") next.quarter = item
    if (periodType === "half-year") next.halfYear = item
    if (filterType === "between" && allowRange) {
      const point = { year, value: item }
      if (!rangeStart || rangeEnd) { next.rangeStart = point; next.rangeEnd = undefined }
      else if (year * 100 + item < rangeStart.year * 100 + rangeStart.value) {
        next.rangeStart = point; next.rangeEnd = rangeStart
      } else { next.rangeStart = rangeStart; next.rangeEnd = point }
    } else { next.rangeStart = undefined; next.rangeEnd = undefined }
    selectValue(next)
  }, [currentValue, periodType, filterType, allowRange, rangeStart, rangeEnd, selectValue])
  const handleYearSelect = useCallback((year: number) => handlePeriodSelect(year, 0), [handlePeriodSelect])
  const handlePeriodTypeChange = useCallback((period: DateSelectorPeriodType) => {
    selectValue({ period, operator: filterType })
  }, [selectValue, filterType])
  const handleFilterTypeChange = useCallback((operator: DateSelectorFilterType) => {
    if (presetMode === undefined) selectValue({ period: periodType, operator })
  }, [presetMode, selectValue, periodType])
  const setSelectedDate = useCallback((next: SetStateAction<Date | undefined>) => {
    selectValue({ ...currentValue, startDate: typeof next === "function" ? next(selectedDate) : next })
  }, [selectValue, currentValue, selectedDate])
  const setSelectedEndDate = useCallback((next: SetStateAction<Date | undefined>) => {
    selectValue({ ...currentValue, endDate: typeof next === "function" ? next(selectedEndDate) : next })
  }, [selectValue, currentValue, selectedEndDate])
  const isInRange = useCallback((year: number, item: number) => {
    if (!rangeStart || !rangeEnd) return false
    const key = year * 100 + item
    return key >= rangeStart.year * 100 + rangeStart.value && key <= rangeEnd.year * 100 + rangeEnd.value
  }, [rangeStart, rangeEnd])
  const isYearInRange = useCallback((year: number) => Boolean(rangeStart && rangeEnd && year >= rangeStart.year && year <= rangeEnd.year), [rangeStart, rangeEnd])

  return {
    periodType, filterType, selectedDate, selectedEndDate, calendarMonth, selectedYear,
    selectedMonth, selectedQuarter, selectedHalfYear, rangeStart, rangeEnd, hoverDate,
    years, currentValue, allowRange,
    setPeriodType: handlePeriodTypeChange, setFilterType: handleFilterTypeChange,
    setSelectedDate, setSelectedEndDate, setCalendarMonth, setHoverDate,
    clearSelection, selectValue, handleDayClick, handlePeriodSelect, handleYearSelect,
    isInRange, isYearInRange,
  }
}

interface DateSelectorFilterToggleProps {
  value: DateSelectorFilterType
  onChange: (value: DateSelectorFilterType) => void
  showBetween?: boolean
  showIs?: boolean
  presetMode?: DateSelectorFilterType
  className?: string
}

function DateSelectorFilterToggle({
  value,
  onChange,
  showBetween = true,
  showIs = true,
  presetMode,
  className,
}: DateSelectorFilterToggleProps) {
  const { i18n } = useDateSelectorContext()
  const isDisabled = presetMode !== undefined

  return (
    <Tabs
      value={value}
      onValueChange={(newValue) => {
        if (!isDisabled && newValue) {
          onChange(newValue as DateSelectorFilterType)
        }
      }}
      className={className}
    >
      <TabsList
        className={cn(
          "bg-muted/80",
          isDisabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {showIs && (
          <TabsTrigger
            value="is"
            aria-label={i18n.filterTypes.is}
            className="py-1 font-normal"
          >
            {i18n.filterTypes.is}
          </TabsTrigger>
        )}
        <TabsTrigger
          value="before"
          aria-label={i18n.filterTypes.before}
          className="py-1 font-normal"
        >
          {i18n.filterTypes.before}
        </TabsTrigger>
        <TabsTrigger
          value="after"
          aria-label={i18n.filterTypes.after}
          className="py-1 font-normal"
        >
          {i18n.filterTypes.after}
        </TabsTrigger>
        {showBetween && (
          <TabsTrigger
            value="between"
            aria-label={i18n.filterTypes.between}
            className="py-1 font-normal"
          >
            {i18n.filterTypes.between}
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  )
}

interface DateSelectorDateSelectorPeriodTabsProps {
  value: DateSelectorPeriodType
  onChange: (value: DateSelectorPeriodType) => void
  periodTypes?: DateSelectorPeriodType[]
  className?: string
  calendarMonth?: Date
  onMonthChange?: (date: Date) => void
  showNavigationButtons?: boolean
}

function DateSelectorPeriodTabs({
  value,
  onChange,
  periodTypes,
  className,
  calendarMonth,
  onMonthChange,
  showNavigationButtons = false,
}: DateSelectorDateSelectorPeriodTabsProps) {
  const { i18n } = useDateSelectorContext()

  const tabs: { value: DateSelectorPeriodType; label: string }[] = [
    { value: "day", label: i18n.periodTypes.day },
    { value: "month", label: i18n.periodTypes.month },
    { value: "quarter", label: i18n.periodTypes.quarter },
    { value: "half-year", label: i18n.periodTypes.halfYear },
    { value: "year", label: i18n.periodTypes.year },
  ]

  const filteredTabs = periodTypes
    ? tabs.filter((tab) => periodTypes.includes(tab.value))
    : tabs

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <Tabs
        value={value}
        onValueChange={(newValue) => {
          if (newValue) {
            onChange(newValue as DateSelectorPeriodType)
          }
        }}
      >
        <TabsList>
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              aria-label={tab.label}
              className="px-1 py-1 font-normal sm:px-2.5"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {showNavigationButtons &&
        value === "day" &&
        calendarMonth &&
        onMonthChange && (
          <div className="flex items-center">
            {(() => {
              const today = new Date()
              const isCurrentMonth = isSameMonth(calendarMonth, today)

              // Only show today button if not on current month
              if (isCurrentMonth) {
                return null
              }

              // Determine direction based on whether calendarMonth is in future or past
              const isFuture = calendarMonth > today

              return (
                <Button
                  variant="ghost"
                  className="size-8.5"
                  onClick={() => onMonthChange(new Date())}
                  title={i18n.today}
                >
                  {isFuture ? (
                    <CornerUpLeftIcon
                    />
                  ) : (
                    <CornerUpRightIcon
                    />
                  )}
                </Button>
              )
            })()}
            <Button
              variant="ghost"
              className="size-8.5"
              onClick={() => onMonthChange(subMonths(calendarMonth, 1))}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              className="size-8.5"
              onClick={() => onMonthChange(addMonths(calendarMonth, 1))}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
    </div>
  )
}

interface DateSelectorDayPickerProps {
  currentMonth: Date
  selectedDate?: Date
  selectedEndDate?: Date
  onDayClick: (day: Date) => void
  isRange: boolean
  onDayHover?: (day: Date | undefined) => void
  hoverDate?: Date
  showTwoMonths?: boolean
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

function DateSelectorDayPicker({
  currentMonth,
  selectedDate,
  selectedEndDate,
  onDayClick,
  isRange,
  onDayHover,
  hoverDate,
  showTwoMonths = true,
  weekStartsOn,
  className,
}: DateSelectorDayPickerProps) {
  const { i18n } = useDateSelectorContext()
  const isMobile = useIsMobile()

  // Convert to react-day-picker format
  const selected: Date | DateRange | undefined = isRange
    ? selectedDate && selectedEndDate
      ? { from: selectedDate, to: selectedEndDate }
      : selectedDate
        ? { from: selectedDate, to: hoverDate || selectedDate }
        : undefined
    : selectedDate

  // DayPicker has already normalized its range; the second argument is the
  // actual clicked day, including a day before the existing start.
  const handleSelect = (_selection: Date | DateRange | undefined, clicked: Date) => {
    onDayClick(clicked)
  }

  // Create custom DayButton component with hover support
  const CustomDayButton = useCallback(
    (props: ComponentProps<typeof DayButton>) => {
      return (
        <CalendarDayButton
          {...props}
          onMouseEnter={() => {
            if (isRange && onDayHover && props.day) {
              onDayHover(props.day.date)
            }
          }}
          onMouseLeave={() => {
            if (isRange && onDayHover) {
              onDayHover(undefined)
            }
          }}
        />
      )
    },
    [isRange, onDayHover]
  )

  // Create custom formatters for i18n
  const formatters = {
    formatWeekdayName: (date: Date) => {
      const dayIndex = date.getDay()
      return i18n.weekdaysShort[dayIndex] || i18n.weekdays[dayIndex]
    },
    formatMonthCaption: (date: Date) => {
      const monthIndex = date.getMonth()
      const year = date.getFullYear()
      return `${i18n.months[monthIndex]} ${year}`
    },
  }

  return (
    <div className={cn("flex w-full items-center justify-between", className)}>
      {isRange ? (
        <Calendar
          month={currentMonth}
          mode="range"
          selected={selected as DateRange | undefined}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : showTwoMonths ? 2 : 1}
          showOutsideDays={true}
          weekStartsOn={weekStartsOn}
          formatters={formatters}
          className="w-full shrink-0 p-0"
          classNames={{
            months: "flex flex-wrap items-start justify-between gap-5 w-full",
            month: "flex flex-col items-center min-w-0 flex-1",
            nav: "hidden",
          }}
          components={{
            DayButton: CustomDayButton,
          }}
        />
      ) : (
        <Calendar
          month={currentMonth}
          mode="single"
          selected={selected as Date | undefined}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : showTwoMonths ? 2 : 1}
          showOutsideDays={true}
          weekStartsOn={weekStartsOn}
          formatters={formatters}
          className="w-full shrink-0 p-0"
          classNames={{
            months: "flex flex-wrap items-start justify-between gap-5 w-full",
            month: "flex flex-col items-center min-w-0 flex-1",
            nav: "hidden",
          }}
          components={{
            DayButton: CustomDayButton,
          }}
        />
      )}
    </div>
  )
}

interface DateSelectorDateSelectorPeriodGridProps {
  years: number[]
  items: string[]
  selectedYear?: number
  selectedValue?: number
  rangeStart?: { year: number; value: number }
  rangeEnd?: { year: number; value: number }
  isInRange: (year: number, value: number) => boolean
  onSelect: (year: number, value: number) => void
  columns: number
  className?: string
}

function DateSelectorPeriodGrid({
  years,
  items,
  selectedYear,
  selectedValue,
  rangeStart,
  rangeEnd,
  isInRange,
  onSelect,
  columns,
  className,
}: DateSelectorDateSelectorPeriodGridProps) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      {years.map((year) => (
        <div key={year}>
          <div className="text-muted-foreground mb-3 text-sm font-medium">
            {year}
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {items.map((item, index) => {
              const isSelected =
                selectedYear === year && selectedValue === index
              const isRangeStart =
                rangeStart?.year === year && rangeStart?.value === index
              const isRangeEnd =
                rangeEnd?.year === year && rangeEnd?.value === index
              const inRange = isInRange(year, index)

              return (
                <Button
                  key={item}
                  size="sm"
                  variant={
                    isSelected || isRangeStart || isRangeEnd
                      ? "default"
                      : "outline"
                  }
                  className={cn(
                    inRange &&
                      !isSelected &&
                      !isRangeStart &&
                      !isRangeEnd &&
                      "bg-accent dark:bg-accent/60"
                  )}
                  onClick={() => onSelect(year, index)}
                >
                  {item}
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

interface DateSelectorYearListProps {
  years: number[]
  selectedYear?: number
  rangeStart?: { year: number; value: number }
  rangeEnd?: { year: number; value: number }
  isYearInRange: (year: number) => boolean
  onSelect: (year: number) => void
  className?: string
}

function DateSelectorYearList({
  years,
  selectedYear,
  rangeStart,
  rangeEnd,
  isYearInRange,
  onSelect,
  className,
}: DateSelectorYearListProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {years.map((year) => {
        const isSelected = selectedYear === year && !rangeStart && !rangeEnd
        const isRangeStart = rangeStart?.year === year
        const isRangeEnd = rangeEnd?.year === year
        const inRange = isYearInRange(year)

        return (
          <Button
            key={year}
            size="sm"
            variant={
              isSelected || isRangeStart || isRangeEnd ? "default" : "outline"
            }
            className={cn(
              inRange &&
                !isSelected &&
                !isRangeStart &&
                !isRangeEnd &&
                "bg-accent dark:bg-accent/60"
            )}
            onClick={() => onSelect(year)}
          >
            {year}
          </Button>
        )
      })}
    </div>
  )
}

export interface DateSelectorProps {
  value?: DateSelectorValue
  onChange?: (value: DateSelectorValue) => void
  allowRange?: boolean
  periodTypes?: DateSelectorPeriodType[]
  defaultPeriodType?: DateSelectorPeriodType
  defaultFilterType?: DateSelectorFilterType
  presetMode?: DateSelectorFilterType
  showInput?: boolean
  showTwoMonths?: boolean
  label?: string
  className?: string
  yearRange?: number
  baseYear?: number
  minYear?: number
  maxYear?: number
  i18n?: Partial<DateSelectorI18nConfig>
  inputHint?: string
  dayDateFormat?: string
  dayDateFormats?: string[]
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export function DateSelector({
  value,
  onChange,
  allowRange = true,
  periodTypes,
  defaultPeriodType = "day",
  defaultFilterType = "is",
  presetMode,
  showInput = true,
  showTwoMonths = true,
  label,
  className,
  yearRange = 10,
  baseYear,
  minYear,
  maxYear,
  i18n: i18nOverride,
  inputHint,
  dayDateFormat = "MM/dd/yyyy",
  dayDateFormats,
  weekStartsOn,
}: DateSelectorProps) {
  const mergedI18n = useMemo(
    () => ({ ...DEFAULT_DATE_SELECTOR_I18N, ...i18nOverride }),
    [i18nOverride]
  )

  const selector = useDateSelector({
    value,
    onChange,
    defaultPeriodType,
    defaultFilterType,
    presetMode,
    allowRange,
    yearRange,
    baseYear,
    minYear,
    maxYear,
    periodTypes,
  })

  const {
    periodType,
    filterType,
    selectedDate,
    selectedEndDate,
    calendarMonth,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedHalfYear,
    rangeStart,
    rangeEnd,
    hoverDate,
    years,
    currentValue,
    setPeriodType,
    setFilterType,
    setCalendarMonth,
    setHoverDate,
    clearSelection,
    selectValue,
    handleDayClick,
    handlePeriodSelect,
    handleYearSelect,
    isInRange,
    isYearInRange,
  } = selector

  const displayValue = formatDateValue(currentValue, mergedI18n, dayDateFormat)
  const [inputValue, setInputValue] = useState(displayValue)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [inputError, setInputError] = useState(false)
  const inputErrorId = useId()

  // Sync input value when displayValue changes (but not when user is typing)
  useEffect(() => {
    if (!isInputFocused) {
      setInputValue(displayValue)
    }
  }, [displayValue, isInputFocused])

  // Compute date formats for parsing
  const dateFormats = useMemo(() => {
    if (dayDateFormats && dayDateFormats.length > 0) {
      // Use provided formats, with dayDateFormat first if not already included
      const formats = [...dayDateFormats]
      if (!formats.includes(dayDateFormat)) {
        formats.unshift(dayDateFormat)
      }
      return formats
    }
    // Default formats: use dayDateFormat first, then common alternatives
    const defaultFormats = [
      dayDateFormat,
      "dd/MM/yyyy",
      "yyyy-MM-dd",
      "MM-dd-yyyy",
      "dd-MM-yyyy",
    ]
    // Remove duplicates while preserving order
    return Array.from(new Set(defaultFormats))
  }, [dayDateFormat, dayDateFormats])

  // Parse input text to DateSelectorValue
  const parseInputValue = useCallback(
    (text: string): DateSelectorValue | null => {
      if (!text.trim()) return null

      const trimmed = text.trim()

      // Try parsing as year (e.g., "2025")
      const yearMatch = trimmed.match(/^\d{4}$/)
      if (yearMatch) {
        const year = parseInt(yearMatch[0])
        if (year >= 1900 && year <= 2100) {
          return {
            period: "year",
            operator: presetMode ?? filterType,
            year,
          }
        }
      }

      // Try parsing as quarter (e.g., "Q4", "Q1 2025")
      const quarterMatch = trimmed.match(/^Q([1-4])(?:\s+(\d{4}))?$/i)
      if (quarterMatch) {
        const quarter = parseInt(quarterMatch[1]) - 1
        const year = quarterMatch[2]
          ? parseInt(quarterMatch[2])
          : new Date().getFullYear()
        if (year >= 1900 && year <= 2100) {
          return {
            period: "quarter",
            operator: presetMode ?? filterType,
            year,
            quarter,
          }
        }
      }

      // Try parsing as date using computed formats
      for (const dateFormat of dateFormats) {
        try {
          const parsed = parse(trimmed, dateFormat, new Date())
          if (!isNaN(parsed.getTime())) {
            return {
              period: "day",
              operator: presetMode ?? filterType,
              startDate: parsed,
            }
          }
        } catch {
          // Continue to next format
        }
      }

      return null
    },
    [filterType, presetMode, dateFormats]
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      setInputError(false)
      if (!newValue.trim()) { clearSelection(); return }

      // Try to parse the input
      const parsed = parseInputValue(newValue)
      if (parsed) {
        selectValue(parsed)
      }
    },
    [selectValue, clearSelection, parseInputValue]
  )

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false)
    // Reset to display value if parsing failed
    if (!parseInputValue(inputValue)) {
      setInputError(Boolean(inputValue.trim()))
      setInputValue(displayValue)
    }
  }, [inputValue, displayValue, parseInputValue])

  return (
    <DateSelectorContext.Provider
      value={{ i18n: mergedI18n, variant: "outline", size: "default" }}
    >
      <div className={cn("w-full space-y-4 sm:w-[470px]", className)}>
        <div className="flex flex-wrap items-center gap-3">
          {label && (
            <h3 className="text-sm font-medium" data-slot="data-selector-label">
              {label}
            </h3>
          )}
          <DateSelectorFilterToggle
            value={filterType}
            onChange={setFilterType}
            showBetween={allowRange}
            presetMode={presetMode}
          />
        </div>
        {showInput && (
          <div className="relative">
            <Input
              type="text"
              aria-invalid={inputError}
              aria-describedby={inputError ? inputErrorId : undefined}
              value={inputHint ? inputValue : displayValue}
              readOnly={!inputHint}
              placeholder={
                isInputFocused && inputHint ? inputHint : mergedI18n.placeholder
              }
              onFocus={() => setIsInputFocused(true)}
              onBlur={handleInputBlur}
              onChange={handleInputChange}
            />
            {(inputHint ? inputValue : displayValue) && (
              <button
                type="button"
                onClick={() => { setInputError(false); clearSelection() }}
                className={cn(
                  // Base Styles
                  "rounded-xs absolute end-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer",
                  // Visual States
                  "opacity-70 transition-opacity hover:opacity-100",
                  // Focus States
                  "ring-offset-background focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none"
                )}
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        )}
        {inputError && <p id={inputErrorId} role="alert" className="text-destructive text-sm">{mergedI18n.invalidInput}</p>}
        <DateSelectorPeriodTabs
          value={periodType}
          onChange={setPeriodType}
          periodTypes={periodTypes}
          calendarMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          showNavigationButtons={periodType === "day"}
        />

        {periodType === "day" ? (
          <div className="w-full pb-1">
            <DateSelectorDayPicker
              currentMonth={calendarMonth}
              selectedDate={selectedDate}
              selectedEndDate={selectedEndDate}
              onDayClick={handleDayClick}
              isRange={filterType === "between" && allowRange}
              onDayHover={setHoverDate}
              hoverDate={hoverDate}
              showTwoMonths={showTwoMonths}
              weekStartsOn={weekStartsOn}
            />
          </div>
        ) : (
          <div className="-mr-3 w-full">
            <ScrollArea key={periodType} className="h-[200px] w-full pe-3">
              {periodType === "month" && (
                <DateSelectorPeriodGrid
                  years={years}
                  items={mergedI18n.monthsShort}
                  selectedYear={selectedYear}
                  selectedValue={selectedMonth}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  isInRange={isInRange}
                  onSelect={handlePeriodSelect}
                  columns={3}
                />
              )}

              {periodType === "quarter" && (
                <DateSelectorPeriodGrid
                  years={years}
                  items={mergedI18n.quarters}
                  selectedYear={selectedYear}
                  selectedValue={selectedQuarter}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  isInRange={isInRange}
                  onSelect={handlePeriodSelect}
                  columns={4}
                />
              )}

              {periodType === "half-year" && (
                <DateSelectorPeriodGrid
                  years={years}
                  items={mergedI18n.halfYears}
                  selectedYear={selectedYear}
                  selectedValue={selectedHalfYear}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  isInRange={isInRange}
                  onSelect={handlePeriodSelect}
                  columns={2}
                />
              )}

              {periodType === "year" && (
                <DateSelectorYearList
                  years={years}
                  selectedYear={selectedYear}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  isYearInRange={isYearInRange}
                  onSelect={handleYearSelect}
                />
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </DateSelectorContext.Provider>
  )
}