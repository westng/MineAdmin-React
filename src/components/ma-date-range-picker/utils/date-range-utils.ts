import { format, isValid, parse } from 'date-fns'

export function readDate(value: unknown, valueFormat: string | 'date') {
  if (value instanceof Date) return isValid(value) ? value : undefined
  if (typeof value !== 'string' || !value) return undefined
  const date = parse(value, valueFormat === 'date' ? 'yyyy-MM-dd' : valueFormat, new Date())
  return isValid(date) ? date : undefined
}

export function writeDate(value: Date, valueFormat: string | 'date') {
  return valueFormat === 'date' ? value : format(value, valueFormat)
}
