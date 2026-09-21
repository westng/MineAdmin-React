import type * as React from 'react'

export type MaRemoteSelectValue = string | number

export type MaRemoteSelectFieldNames = {
  value?: string
  label?: string
  disabled?: string
}

export type MaRemoteSelectRequestConfig = {
  url: string
  method?: 'get' | 'post' | 'put' | 'patch'
  params?: Record<string, unknown>
  data?: unknown
  signal?: AbortSignal
}

export type MaRemoteSelectRequest = <T = unknown>(config: MaRemoteSelectRequestConfig) => Promise<{ data: T }>

export type MaRemoteSelectPage<T> = {
  items: T[]
  hasMore?: boolean
}

export type MaRemoteSelectResponseMap<T> = (response: unknown) => MaRemoteSelectPage<T>

export type MaRemoteSelectEcho = {
  url?: string
  params?: Record<string, unknown>
  valueParam?: string
}

export type MaRemoteSelectProps<T = Record<string, unknown>> = {
  url: string
  method?: MaRemoteSelectRequestConfig['method']
  params?: Record<string, unknown>
  data?: unknown
  value?: MaRemoteSelectValue | MaRemoteSelectValue[] | null
  onChange?: (value: MaRemoteSelectValue | MaRemoteSelectValue[] | null) => void
  onSelectOption?: (option: T | T[] | null) => void
  fieldNames?: MaRemoteSelectFieldNames
  responseMap?: MaRemoteSelectResponseMap<T>
  request?: MaRemoteSelectRequest
  echo?: boolean | MaRemoteSelectEcho
  multiple?: boolean
  searchable?: boolean
  searchParam?: string
  pagination?: boolean
  pageSize?: number
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  placeholder?: React.ReactNode
  className?: string
  popupClassName?: string
  id?: string
  name?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
}
