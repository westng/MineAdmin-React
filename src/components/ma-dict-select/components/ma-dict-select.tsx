import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/reui/primitives/select'
import { cn } from '@/utils/cn'
import { MaDictionaryContext } from '../context/dictionary-context'
import type { MaDictOption, MaDictSelectProps, MaDictSelectValue } from '../types'

const EMPTY_DICTIONARY: MaDictOption[] = []

function valueKey(value: MaDictSelectValue | null | undefined) {
  return value === null || value === undefined ? null : String(value)
}

export function MaDictSelect({
  dictName,
  value,
  defaultValue,
  onChange,
  onValueChange,
  clearable = true,
  placeholder = '请选择',
  disabled = false,
  readOnly = false,
  triggerProps,
  contentProps,
  itemProps,
  ...rootProps
}: MaDictSelectProps) {
  const source = React.useContext(MaDictionaryContext)
  const dictionaries = React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
  React.useSyncExternalStore(source.subscribeLocale, source.getLocaleSnapshot, source.getLocaleSnapshot)
  const translate = source.translate
  const dictionary = dictionaries[dictName] ?? EMPTY_DICTIONARY
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState<MaDictSelectValue | null>(defaultValue ?? null)
  const currentValue = controlled ? value : internalValue
  const selectedKey = valueKey(currentValue)
  const canClear = Boolean(clearable && !disabled && !readOnly && selectedKey !== null && selectedKey !== '')

  const emitValue = React.useCallback(
    (nextValue: MaDictSelectValue | null) => {
      if (!controlled) setInternalValue(nextValue)
      onChange?.(nextValue)
      onValueChange?.(nextValue)
    },
    [controlled, onChange, onValueChange],
  )

  const handleValueChange = React.useCallback(
    (nextKey: string | null) => {
      const nextItem = dictionary.find(item => String(item.value) === nextKey)
      emitValue(nextItem?.value ?? null)
    },
    [dictionary, emitValue],
  )

  const handleClear = React.useCallback(() => emitValue(null), [emitValue])

  return (
    <div className="relative w-full">
      <Select
        {...rootProps}
        value={selectedKey}
        disabled={disabled}
        readOnly={readOnly}
        onValueChange={(next, details) => {
          if (!details.isCanceled) handleValueChange(next)
        }}
      >
        <SelectTrigger
          {...triggerProps}
          aria-label={triggerProps?.['aria-label']}
          className={state =>
            cn(
              'w-full',
              typeof triggerProps?.className === 'function' ? triggerProps.className(state) : triggerProps?.className,
            )
          }
        >
          <SelectValue placeholder={placeholder} className={cn('min-w-0', canClear && 'pr-7')} />
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          {...contentProps}
          className={state =>
            cn(
              'max-h-[min(15rem,var(--available-height))]',
              typeof contentProps?.className === 'function' ? contentProps.className(state) : contentProps?.className,
            )
          }
        >
          {dictionary.map(item => (
            <SelectItem
              {...itemProps}
              key={String(item.value)}
              value={String(item.value)}
              disabled={Boolean(item.disabled || itemProps?.disabled)}
            >
              {item.i18n ? translate(item.i18n, item.label) : item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canClear && (
        <button
          type="button"
          aria-label="清除"
          title="清除"
          className="absolute top-1/2 right-7 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          onPointerDown={event => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            handleClear()
          }}
        >
          <XIcon className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
