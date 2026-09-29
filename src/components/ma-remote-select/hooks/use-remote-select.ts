import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import { DEFAULT_PAGE_SIZE, DEFAULT_SEARCH_PARAM, EMPTY_FIELD_NAMES } from '../data/defaults'
import {
  getValue,
  getLabel,
  getDisabled,
  defaultResponseMap,
  mergeOptions,
  isCanceledError,
  getErrorMessage,
} from '../utils/remote-select-utils'
import type { RemoteOption } from '../types/internal'
import type { MaRemoteSelectProps, MaRemoteSelectRequestConfig, MaRemoteSelectValue } from '../types'

export function useRemoteSelect<T>({
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
  searchParam = DEFAULT_SEARCH_PARAM,
  pagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
  clearable = true,
  disabled = false,
  readOnly = false,
}: MaRemoteSelectProps<T>) {
  const requestOptions = request
  const [options, setOptions] = useState<RemoteOption<T>[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [listLoading, setLoading] = useState(false)
  const [listError, setError] = useState<string | null>(null)
  const [echoLoading, setEchoLoading] = useState(false)
  const [echoError, setEchoError] = useState<string | null>(null)
  const loading = listLoading || echoLoading
  const error = listError ?? echoError
  const [hasMore, setHasMore] = useState(false)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const echoAbortRef = useRef<AbortController | null>(null)
  const echoRequestIdRef = useRef(0)
  const echoAttemptRef = useRef<string | null>(null)
  const pageRef = useRef(1)
  const loadedKeyRef = useRef<string | null>(null)
  const values = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : value == null ? [] : [value]
    return value == null || Array.isArray(value) ? [] : [value]
  }, [multiple, value])
  const valuesRef = useRef(values)
  useLayoutEffect(() => {
    valuesRef.current = values
  }, [values])
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
    async (nextQuery: string, page: number, replace: boolean) => {
      const requestId = ++requestIdRef.current
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const response = await getRequest({
          url,
          method,
          params: {
            ...params,
            ...(nextQuery ? { [searchParam]: nextQuery } : {}),
            ...(pagination ? { page, page_size: pageSize } : {}),
          },
          data,
          signal: controller.signal,
        })
        if (requestId !== requestIdRef.current) return

        const result = responseMap ? responseMap(response.data) : defaultResponseMap(response.data, page, pageSize)
        const nextOptions = normalizeOptions(result.items)
        const selectedValues = valuesRef.current
        setOptions(current =>
          mergeOptions(
            replace ? current.filter(option => selectedValues.includes(option.value)) : current,
            nextOptions,
          ),
        )
        setHasMore(Boolean(pagination && result.hasMore))
        pageRef.current = page + 1
        loadedKeyRef.current = `${url}|${paramsKey}|${nextQuery}`
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

  const echoSelection = useCallback(
    async (retry = false) => {
      const missingValues = values.filter(selectedValue => !options.some(option => option.value === selectedValue))
      if (echo === false || missingValues.length === 0) {
        setEchoLoading(false)
        setEchoError(null)
        return
      }
      // Empty or partial results are final for this selection; only an explicit retry repeats a failed echo.
      if (!retry && echoAttemptRef.current === valuesKey) return
      echoAttemptRef.current = valuesKey
      const requestId = ++echoRequestIdRef.current
      echoAbortRef.current?.abort()
      const controller = new AbortController()
      echoAbortRef.current = controller
      setEchoLoading(true)
      setEchoError(null)
      const echoConfig = typeof echo === 'object' ? echo : {}

      try {
        const response = await getRequest({
          url: echoConfig.url ?? url,
          method,
          params: {
            ...params,
            ...echoConfig.params,
            [echoConfig.valueParam ?? 'ids']: multiple ? missingValues : missingValues[0],
          },
          data,
          signal: controller.signal,
        })
        if (requestId !== echoRequestIdRef.current || controller.signal.aborted) return
        const result = responseMap ? responseMap(response.data) : defaultResponseMap(response.data, 1, pageSize)
        const nextOptions = normalizeOptions(result.items)
        if (nextOptions.length) setOptions(current => mergeOptions(current, nextOptions))
      } catch (loadError) {
        if (requestId !== echoRequestIdRef.current || controller.signal.aborted || isCanceledError(loadError)) return
        setEchoError(getErrorMessage(loadError))
      } finally {
        if (requestId === echoRequestIdRef.current) setEchoLoading(false)
      }
    },
    [
      data,
      echo,
      getRequest,
      method,
      multiple,
      normalizeOptions,
      options,
      pageSize,
      params,
      responseMap,
      url,
      values,
      valuesKey,
    ],
  )

  useLayoutEffect(() => {
    echoRequestIdRef.current += 1
    echoAbortRef.current?.abort()
    echoAttemptRef.current = null
  }, [valuesKey])

  useEffect(() => {
    const timer = window.setTimeout(() => void echoSelection(), 0)
    return () => window.clearTimeout(timer)
  }, [echoSelection, valuesKey])

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
      echoAbortRef.current?.abort()
      echoRequestIdRef.current += 1
    },
    [],
  )

  const itemValues = useMemo(() => options.map(option => option.value), [options])
  const canClear = Boolean(clearable && !disabled && !readOnly && values.length > 0)
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
    (event: UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget
      if (loading || !hasMore || element.scrollTop + element.clientHeight < element.scrollHeight - 24) return
      void load(query, pageRef.current, false)
    },
    [hasMore, load, loading, query],
  )

  const retry = useCallback(() => {
    if (echoError) void echoSelection(true)
    if (listError || !echoError) {
      pageRef.current = 1
      void load(query, 1, true)
    }
  }, [echoError, echoSelection, listError, load, query])
  return {
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
  }
}
