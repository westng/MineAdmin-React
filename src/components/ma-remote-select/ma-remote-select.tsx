import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as React from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'

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

import { useMaRemoteSelectRequest } from './request-context'
import type {
  MaRemoteSelectFieldNames,
  MaRemoteSelectPage,
  MaRemoteSelectProps,
  MaRemoteSelectRequestConfig,
  MaRemoteSelectValue,
} from './types'

type RemoteOption<T> = {
  value: MaRemoteSelectValue
  label: React.ReactNode
  raw: T
  disabled: boolean
}

type ResponseRecord = Record<string, unknown>

const DEFAULT_PAGE_SIZE = 20
const DEFAULT_SEARCH_PARAM = 'keywords'
const EMPTY_FIELD_NAMES: MaRemoteSelectFieldNames = {}

function isRecord(value: unknown): value is ResponseRecord {
  return typeof value === 'object' && value !== null
}

function getValue(item: unknown, fieldNames: MaRemoteSelectFieldNames): MaRemoteSelectValue {
  if (!isRecord(item)) return String(item ?? '')
  const configured = fieldNames.value ? item[fieldNames.value] : undefined
  const value = configured ?? item.value ?? item.id ?? item.code
  return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '')
}

function getLabel(item: unknown, fieldNames: MaRemoteSelectFieldNames, value: MaRemoteSelectValue): React.ReactNode {
  if (!isRecord(item)) return String(item ?? value)
  const configured = fieldNames.label ? item[fieldNames.label] : undefined
  const label = configured ?? item.label ?? item.name ?? item.title ?? value
  return typeof label === 'string' || typeof label === 'number' ? label : String(label ?? value)
}

function getDisabled(item: unknown, fieldNames: MaRemoteSelectFieldNames) {
  if (!isRecord(item)) return false
  const configured = fieldNames.disabled ? item[fieldNames.disabled] : undefined
  return Boolean(configured ?? item.disabled)
}

function getResponseBody(response: unknown): unknown {
  if (isRecord(response) && 'data' in response) return response.data
  return response
}

function defaultResponseMap(response: unknown, page: number, pageSize: number): MaRemoteSelectPage<unknown> {
  const body = getResponseBody(response)
  if (Array.isArray(body)) return { items: body, hasMore: false }
  if (!isRecord(body)) return { items: [], hasMore: false }

  const items = Array.isArray(body.items) ? body.items : Array.isArray(body.list) ? body.list : []
  const explicitHasMore = body.hasMore ?? body.has_more
  if (typeof explicitHasMore === 'boolean') return { items, hasMore: explicitHasMore }

  const total = typeof body.total === 'number' ? body.total : undefined
  return {
    items,
    hasMore: total === undefined ? items.length >= pageSize : page * pageSize < total,
  }
}

function mergeOptions<T>(current: RemoteOption<T>[], incoming: RemoteOption<T>[]) {
  const result = [...current]
  const indexes = new Map(result.map((option, index) => [option.value, index]))
  for (const option of incoming) {
    const index = indexes.get(option.value)
    if (index === undefined) {
      indexes.set(option.value, result.length)
      result.push(option)
    } else {
      result[index] = option
    }
  }
  return result
}

function isCanceledError(error: unknown) {
  return isRecord(error) && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')
}

function getErrorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') return error.message
  if (error instanceof Error) return error.message
  return '加载选项失败'
}

export function MaRemoteSelect<T = Record<string, unknown>>({
  url,
  method = 'get',
  params,
  data,
  value,
  onChange,
  onSelectOption,
  fieldNames = EMPTY_FIELD_NAMES,
  responseMap,
  request,
  echo = true,
  multiple = false,
  searchable = true,
  searchParam = DEFAULT_SEARCH_PARAM,
  pagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
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
}: MaRemoteSelectProps<T>) {
  const contextRequest = useMaRemoteSelectRequest()
  const requestOptions = request ?? contextRequest
  const [options, setOptions] = useState<RemoteOption<T>[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const pageRef = useRef(1)
  const loadedKeyRef = useRef<string | null>(null)
  const values = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : value == null ? [] : [value]
    return value == null || Array.isArray(value) ? [] : [value]
  }, [multiple, value])
  const valuesKey = JSON.stringify(values)
  const paramsKey = JSON.stringify(params ?? {})

  const normalizeOptions = useCallback(
    (items: unknown[]) =>
      items.map(item => {
        const optionValue = getValue(item, fieldNames)
        return {
          value: optionValue,
          label: getLabel(item, fieldNames, optionValue),
          raw: item as T,
          disabled: getDisabled(item, fieldNames),
        }
      }),
    [fieldNames],
  )

  const getRequest = useCallback(
    (config: MaRemoteSelectRequestConfig) => {
      if (requestOptions) return requestOptions(config)
      return Promise.reject(new Error('MaRemoteSelect 未配置请求客户端'))
    },
    [requestOptions],
  )

  const load = useCallback(
    async (nextQuery: string, page: number, replace: boolean, requestConfig?: MaRemoteSelectRequestConfig) => {
      const requestId = ++requestIdRef.current
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const response = await getRequest({
          ...(requestConfig ?? {
            url,
            method,
            params: {
              ...params,
              ...(nextQuery ? { [searchParam]: nextQuery } : {}),
              ...(pagination ? { page, page_size: pageSize } : {}),
            },
            data,
          }),
          signal: controller.signal,
        })
        if (requestId !== requestIdRef.current) return

        const result = responseMap ? responseMap(response.data) : defaultResponseMap(response.data, page, pageSize)
        const nextOptions = normalizeOptions(result.items)
        setOptions(current => (replace ? mergeOptions([], nextOptions) : mergeOptions(current, nextOptions)))
        setHasMore(Boolean(pagination && result.hasMore))
        pageRef.current = page + 1
        if (!requestConfig) loadedKeyRef.current = `${url}|${paramsKey}|${nextQuery}`
      } catch (loadError) {
        if (requestId !== requestIdRef.current || controller.signal.aborted || isCanceledError(loadError)) return
        setError(getErrorMessage(loadError))
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [
      data,
      getRequest,
      method,
      normalizeOptions,
      pageSize,
      params,
      paramsKey,
      pagination,
      responseMap,
      searchParam,
      url,
    ],
  )

  const echoSelection = useCallback(async () => {
    if (echo === false || values.length === 0) return
    const missingValues = values.filter(selectedValue => !options.some(option => option.value === selectedValue))
    if (missingValues.length === 0) return

    const echoConfig = typeof echo === 'object' ? echo : {}
    const valueParam = echoConfig.valueParam ?? 'ids'
    const echoValue = multiple ? missingValues : missingValues[0]
    await load('', 1, false, {
      url: echoConfig.url ?? url,
      method,
      params: {
        ...params,
        ...echoConfig.params,
        [valueParam]: echoValue,
      },
      data,
      signal: undefined,
    })
  }, [data, echo, load, method, multiple, options, params, url, values])

  useEffect(() => {
    const timer = window.setTimeout(() => void echoSelection(), 0)
    return () => window.clearTimeout(timer)
  }, [echoSelection, valuesKey])

  useEffect(() => {
    pageRef.current = 1
    loadedKeyRef.current = null
    requestIdRef.current += 1
    abortRef.current?.abort()
  }, [paramsKey, url])

  useEffect(() => {
    if (!open) return
    const loadedKey = `${url}|${paramsKey}|${query}`
    if (loadedKeyRef.current === loadedKey && query === '') return
    const timer = window.setTimeout(
      () => {
        pageRef.current = 1
        void load(query, 1, true)
      },
      query ? 250 : 0,
    )
    return () => window.clearTimeout(timer)
  }, [load, open, paramsKey, query, url])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      requestIdRef.current += 1
    },
    [],
  )

  const itemValues = useMemo(() => options.map(option => option.value), [options])
  const handleValueChange = useCallback(
    (nextValue: MaRemoteSelectValue | MaRemoteSelectValue[] | null, details: { isCanceled: boolean }) => {
      if (details.isCanceled) return
      setQuery('')
      onChange?.(nextValue)
      if (!onSelectOption) return
      if (multiple) {
        const nextValues = Array.isArray(nextValue) ? nextValue : []
        onSelectOption(options.filter(option => nextValues.includes(option.value)).map(option => option.raw))
      } else {
        const nextOption = options.find(option => option.value === nextValue)
        onSelectOption(nextOption?.raw ?? null)
      }
    },
    [multiple, onChange, onSelectOption, options],
  )

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget
      if (loading || !hasMore || element.scrollTop + element.clientHeight < element.scrollHeight - 24) return
      void load(query, pageRef.current, false)
    },
    [hasMore, load, loading, query],
  )

  const retry = useCallback(() => {
    pageRef.current = 1
    void load(query, 1, true)
  }, [load, query])

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
        <span className="min-w-0 flex-1 truncate text-left">
          <ComboboxValue placeholder={placeholder} />
        </span>
      </ComboboxTrigger>
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
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
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
