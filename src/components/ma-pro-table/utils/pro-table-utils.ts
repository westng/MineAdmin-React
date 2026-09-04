import { getPathValue } from '../../shared/path'
import type { MaModel } from '../../shared/types'

export interface ResponseRecord {
  [key: string]: unknown
}

function getResponseRecords(response: unknown): ResponseRecord[] {
  const records: ResponseRecord[] = []
  let cursor: unknown = response
  for (let index = 0; index < 5; index += 1) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) break
    const record = cursor as ResponseRecord
    records.push(record)
    if (!('data' in record)) break
    cursor = record.data
  }
  return records
}

export function readResponseList<T extends MaModel>(response: unknown, dataKey: string): { list: T[]; record: ResponseRecord } {
  const records = getResponseRecords(response)
  for (const record of records) {
    const value = getPathValue(record, dataKey)
    if (Array.isArray(value)) return { list: value as T[], record }
  }
  const fallback = records.find(record => Array.isArray(record.list) || Array.isArray(record.items) || Array.isArray(record.data))
  if (fallback) return { list: (fallback.list ?? fallback.items ?? fallback.data) as T[], record: fallback }
  return { list: [], record: records[0] ?? {} }
}

export function readResponseTotal(response: unknown, totalKey: string, fallback: number): number {
  for (const record of getResponseRecords(response)) {
    const value = getPathValue(record, totalKey)
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value)
  }
  return fallback
}

export function resolveText(value: string | (() => string) | undefined, fallback: string): string {
  return typeof value === 'function' ? value() : value ?? fallback
}

export function resolveVisible(value: boolean | (() => boolean) | undefined, fallback: boolean): boolean {
  return typeof value === 'function' ? value() : value ?? fallback
}
