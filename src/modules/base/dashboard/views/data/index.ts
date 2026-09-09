import { BadgeCheck, CalendarCheck2, DollarSign, Eye, Flag, Radio, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type { ChartConfig } from '@/components/ui/chart'
import type { DashboardMetric, DashboardOverview, DashboardOverviewParams, DashboardOverviewTrendItem } from '@/modules/base/dashboard/api/dashboard'

export type MetricFormat = 'count' | 'currency' | 'decimal'

export type KpiDefinition = {
  key: string
  title: string
  metricLabel: string
  format: MetricFormat
  icon: LucideIcon
  trendKey?: Exclude<keyof DashboardOverviewTrendItem, 'date'>
}

export type BreakdownRow = {
  bucket: string
  detail: string
  code: string
  count: number
  exposureCount: number | null
  estimatedSalesAmount: string | null
  actualSalesAmount: string | null
}

export const kpiDefinitions: KpiDefinition[] = [
  { key: 'schedule_count_total', title: '营销日程总数', metricLabel: '统计周期记录', format: 'count', icon: CalendarCheck2, trendKey: 'schedule_count' },
  { key: 'seeding_session_count', title: '达人种草场次', metricLabel: '达人种草日程记录', format: 'count', icon: Eye },
  { key: 'affiliate_live_session_count', title: '达人直播/短直场次', metricLabel: '达人直播与短直日程记录', format: 'count', icon: Radio },
  { key: 'marketing_node_count', title: '营销节点数', metricLabel: '营销节点日程记录', format: 'count', icon: Flag },
  { key: 'official_activity_count', title: '官方活动数', metricLabel: '去重后的活动', format: 'count', icon: BadgeCheck },
  { key: 'exposure_count_total', title: '总曝光数', metricLabel: '已录入曝光量', format: 'count', icon: Eye, trendKey: 'exposure_count_total' },
  { key: 'estimated_sales_amount_total', title: '预估销售额', metricLabel: '达播预估金额', format: 'currency', icon: TrendingUp, trendKey: 'estimated_sales_amount_total' },
  { key: 'actual_sales_amount_total', title: '实际销售额', metricLabel: '达播实际金额', format: 'currency', icon: DollarSign, trendKey: 'actual_sales_amount_total' },
  { key: 'quotation_amount_total', title: '报价合计', metricLabel: '种草报价金额', format: 'currency', icon: DollarSign },
  { key: 'cpm_average', title: '平均 CPM', metricLabel: '种草 CPM 均值', format: 'decimal', icon: TrendingUp },
  { key: 'a3_average', title: '平均 A3', metricLabel: '种草 A3 均值', format: 'decimal', icon: Target },
]

export const marketingTypeLabels: Record<string, string> = {
  node_campaign: '营销节点',
  platform_campaign: '平台活动',
  brand_campaign: '品牌活动',
}

export const scheduleStatusLabels: Record<string, string> = {
  draft: '草稿',
  planned: '已计划',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

export const numberFormatter = new Intl.NumberFormat('zh-CN')
export const decimalFormatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compactFormatter = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 2 })

export function formatMetricValue(value: number | string | null, format: MetricFormat, emptyLabel = '未录入') {
  if (value === null || value === '') return emptyLabel
  if (format === 'count') return numberFormatter.format(Number(value))
  if (format === 'currency') return `¥${decimalFormatter.format(Number(value))}`
  return decimalFormatter.format(Number(value))
}

export function formatMomRate(rate: number | null) {
  if (rate === null) return '暂无环比'
  return `${rate > 0 ? '+' : ''}${decimalFormatter.format(rate)}%`
}

export function formatKpiValue(value: DashboardMetric['value'], format: MetricFormat) {
  if (value === null || value === '' || Math.abs(Number(value)) < 10000) return formatMetricValue(value, format)
  return `${format === 'currency' ? '¥' : ''}${compactFormatter.format(Number(value))}`
}

export function getKpiChart(definition: KpiDefinition, metric: DashboardMetric, trend: DashboardOverviewTrendItem[]) {
  const { trendKey } = definition
  const isTrend = Boolean(trendKey && trend.length > 1)
  const source = trendKey && isTrend
    ? trend.slice(-12).map(item => ({ label: item.date, value: item[trendKey] }))
    : [{ label: '上期', value: metric.previous_value }, { label: '本期', value: metric.value }]
  const points = source.map(point => ({
    label: point.label,
    value: point.value === null || point.value === '' || !Number.isFinite(Number(point.value)) ? null : Number(point.value),
  }))
  return { isTrend, points }
}

export function getMetric(summary: DashboardOverview['summary'], key: string): DashboardMetric {
  return summary[key] || { value: null, previous_value: null, mom_rate: null, mom_direction: 'flat' }
}

export function formatTrendDate(date: string) {
  return date.length >= 10 ? date.slice(5, 10) : date
}

export const marketingTypeChartConfig = {
  count: { label: '日程数', color: 'var(--color-blue-600)' },
} satisfies ChartConfig

export const trendChartConfig = {
  scheduleCount: { label: '日程数', color: 'var(--color-yellow-500)' },
  exposureCount: { label: '曝光量', color: 'var(--color-emerald-500)' },
} satisfies ChartConfig

export type QuickRangeKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'

export const quickRanges: Array<{ key: QuickRangeKey; label: string }> = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'last7', label: '过去7天' },
  { key: 'last30', label: '过去30天' },
  { key: 'thisMonth', label: '本月至今' },
  { key: 'lastMonth', label: '上个月' },
  { key: 'thisYear', label: '今年迄今为止' },
  { key: 'lastYear', label: '去年' },
]

export function quickRange(key: QuickRangeKey, now = new Date()): DateRange {
  const today = startOfDay(now)
  if (key === 'yesterday') {
    const yesterday = subDays(today, 1)
    return { from: yesterday, to: yesterday }
  }
  if (key === 'last7') return { from: subDays(today, 6), to: today }
  if (key === 'last30') return { from: subDays(today, 29), to: today }
  if (key === 'thisMonth') return { from: startOfMonth(today), to: today }
  if (key === 'lastMonth') {
    const month = subMonths(today, 1)
    return { from: startOfMonth(month), to: endOfMonth(month) }
  }
  if (key === 'thisYear') return { from: startOfYear(today), to: today }
  if (key === 'lastYear') {
    const year = subYears(today, 1)
    return { from: startOfYear(year), to: endOfYear(year) }
  }
  return { from: today, to: today }
}

export type DashboardFilterChange = (params?: DashboardOverviewParams) => void
