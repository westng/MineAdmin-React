import { useState } from 'react'
import { LoaderCircle, RefreshCw, XIcon } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  ComboboxTrigger,
} from '@/components/reui/primitives/combobox'
import { Button } from '@/components/reui/primitives/button'
import { cn } from '@/utils/cn'
import { useMaRemoteSelectRequest } from '../hooks/use-remote-select-request'
import { useRemoteSelect } from '../hooks/use-remote-select'
import { DEFAULT_PAGE_SIZE, DEFAULT_SEARCH_PARAM, EMPTY_FIELD_NAMES } from '../data/defaults'
import type { MaRemoteSelectProps } from '../types'

export function MaRemoteSelect<T = Record<string, unknown>>(props: MaRemoteSelectProps<T>) {
  const contextRequest = useMaRemoteSelectRequest()
  const request = props.request ?? contextRequest ?? undefined
  const sourceKey = JSON.stringify({
    url: props.url,
    method: props.method ?? 'get',
    params: props.params ?? {},
    data: props.data,
    fieldNames: props.fieldNames ?? EMPTY_FIELD_NAMES,
    echo: props.echo ?? true,
    multiple: props.multiple ?? false,
    searchParam: props.searchParam ?? DEFAULT_SEARCH_PARAM,
    pagination: props.pagination ?? true,
    pageSize: props.pageSize ?? DEFAULT_PAGE_SIZE,
  })
  const [source, setSource] = useState({ sourceKey, request, responseMap: props.responseMap, revision: 0 })
  const changed =
    source.sourceKey !== sourceKey || source.request !== request || source.responseMap !== props.responseMap
  const revision = source.revision + (changed ? 1 : 0)
  if (changed) setSource({ sourceKey, request, responseMap: props.responseMap, revision })

  // A new source owns new options, paging and requests; selected values stay controlled by the caller.
  return <RemoteSelect key={revision} {...props} request={request} />
}

function RemoteSelect<T>(props: MaRemoteSelectProps<T>) {
  const {
    renderOption,
    renderValue,
    multiple = false,
    searchable = true,
    disabled = false,
    readOnly = false,
    required = false,
    placeholder = '请选择',
    className,
    popupClassName,
    id,
    name,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  } = props
  const {
    options,
    values,
    itemValues,
    canClear,
    loading,
    error,
    setOpen,
    setQuery,
    handleValueChange,
    handleScroll,
    retry,
  } = useRemoteSelect(props)
  return (
    <Combobox
      items={itemValues}
      value={multiple ? values : (values[0] ?? null)}
      multiple={multiple}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      autoHighlight
      filter={null}
      itemToStringLabel={itemValue => {
        const option = options.find(item => item.value === itemValue)
        return option ? String(option.label) : String(itemValue ?? '')
      }}
      onOpenChange={nextOpen => setOpen(nextOpen)}
      onInputValueChange={(inputValue, details) => {
        if (!searchable || (details.reason !== 'input-change' && details.reason !== 'input-clear')) return
        setQuery(inputValue)
      }}
      onValueChange={handleValueChange}
    >
      <div className="relative w-full">
        <ComboboxTrigger
          render={
            <Button
              type="button"
              variant="outline"
              id={id}
              name={name}
              disabled={disabled}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              aria-describedby={ariaDescribedBy}
              aria-invalid={ariaInvalid}
              className={cn('w-full min-w-0 justify-between font-normal', className)}
            />
          }
        >
          <span className={cn('min-w-0 flex-1 truncate text-left', canClear && 'pr-7')}>
            {renderValue ? (
              <ComboboxValue placeholder={placeholder}>
                {selectedValue => {
                  const option = options.find(item => item.value === selectedValue)
                  return option ? (renderValue(option.raw) ?? option.label) : undefined
                }}
              </ComboboxValue>
            ) : (
              <ComboboxValue placeholder={placeholder} />
            )}
          </span>
        </ComboboxTrigger>
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
              handleValueChange(multiple ? [] : null, { isCanceled: false })
            }}
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <ComboboxContent className={popupClassName}>
        {searchable && <ComboboxInput placeholder="请输入关键词" disabled={disabled || readOnly} showTrigger={false} />}
        {error && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-sm text-destructive" role="alert">
            <span className="min-w-0 truncate">{error}</span>
            <Button type="button" variant="ghost" size="sm" onClick={retry} disabled={loading}>
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin motion-reduce:animate-none')}
                aria-hidden="true"
              />
              重试
            </Button>
          </div>
        )}
        <ComboboxEmpty>{loading && options.length === 0 ? '正在加载...' : '暂无数据'}</ComboboxEmpty>
        <ComboboxList onScroll={handleScroll}>
          {options.map(option => (
            <ComboboxItem key={String(option.value)} value={option.value} disabled={option.disabled}>
              {renderOption ? (
                renderOption(option.raw)
              ) : (
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              )}
            </ComboboxItem>
          ))}
          {loading && options.length > 0 && (
            <div
              className="flex items-center justify-center gap-2 px-2 py-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              正在加载...
            </div>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
