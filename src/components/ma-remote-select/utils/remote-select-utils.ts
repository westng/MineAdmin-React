import type { ReactNode } from 'react'
import type { MaRemoteSelectFieldNames, MaRemoteSelectPage, MaRemoteSelectValue } from '../types'
import type { RemoteOption } from '../types/internal'

type ResponseRecord = Record<string, unknown>

export function isRecord(value: unknown): value is ResponseRecord {
  return typeof value === 'object' && value !== null
}

export function getValue(item: unknown, fieldNames: MaRemoteSelectFieldNames): MaRemoteSelectValue {
  if (!isRecord(item)) return String(item ?? '')
  const configured = fieldNames.value ? item[fieldNames.value] : undefined
  const value = configured ?? item.value ?? item.id ?? item.code
  return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '')
}

export function getLabel(item: unknown, fieldNames: MaRemoteSelectFieldNames, value: MaRemoteSelectValue): ReactNode {
  if (!isRecord(item)) return String(item ?? value)
  const configured = fieldNames.label ? item[fieldNames.label] : undefined
  const label = configured ?? item.label ?? item.name ?? item.title ?? value
  return typeof label === 'string' || typeof label === 'number' ? label : String(label ?? value)
}

export function getDisabled(item: unknown, fieldNames: MaRemoteSelectFieldNames) {
  if (!isRecord(item)) return false
  const configured = fieldNames.disabled ? item[fieldNames.disabled] : undefined
  return Boolean(configured ?? item.disabled)
}

export function getResponseBody(response: unknown): unknown {
  if (isRecord(response) && 'data' in response) return response.data
  return response
}

export function defaultResponseMap(response: unknown, page: number, pageSize: number): MaRemoteSelectPage<unknown> {
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

export function mergeOptions<T>(current: RemoteOption<T>[], incoming: RemoteOption<T>[]) {
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

export function isCanceledError(error: unknown) {
  return isRecord(error) && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')
}

export function getErrorMessage(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') return error.message
  if (error instanceof Error) return error.message
  return '加载选项失败'
}
