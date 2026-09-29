import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
} from 'date-fns'
import type { MaDateRangeShortcut } from '../types'

function createDateRange(from: Date, to: Date) {
  return [format(startOfDay(from), 'yyyy-MM-dd HH:mm:ss'), format(endOfDay(to), 'yyyy-MM-dd HH:mm:ss')]
}

export const defaultDateRangeShortcuts: readonly MaDateRangeShortcut[] = [
  { label: '今天', getValue: () => createDateRange(new Date(), new Date()) },
  { label: '昨天', getValue: () => createDateRange(subDays(new Date(), 1), subDays(new Date(), 1)) },
  { label: '近7天', getValue: () => createDateRange(subDays(new Date(), 6), new Date()) },
  { label: '近30天', getValue: () => createDateRange(subDays(new Date(), 29), new Date()) },
  { label: '本周', getValue: () => createDateRange(startOfWeek(new Date(), { weekStartsOn: 1 }), new Date()) },
  { label: '本月', getValue: () => createDateRange(startOfMonth(new Date()), new Date()) },
  {
    label: '上个月',
    getValue: () => {
      const previousMonth = subMonths(new Date(), 1)
      return createDateRange(startOfMonth(previousMonth), endOfMonth(previousMonth))
    },
  },
  { label: '近3个月', getValue: () => createDateRange(subMonths(new Date(), 3), new Date()) },
  { label: '近1年', getValue: () => createDateRange(subYears(new Date(), 1), new Date()) },
]
