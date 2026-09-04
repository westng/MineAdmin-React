import { BadgeCheck, CalendarCheck2, DollarSign, Eye, Flag, Radio } from 'lucide-react'
import { endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear, subDays, subMonths, subYears } from 'date-fns'
import type { ComponentType } from 'react'
import type { DateRange } from 'react-day-picker'
import type { ChartConfig } from '@/components/ui/chart'
import type { DashboardMetric, DashboardOverview, DashboardOverviewParams } from '@/modules/base/dashboard/api/dashboard'

export type MetricFormat = 'count' | 'currency' | 'decimal'

export type KpiDefinition = {
  key: string
  eyebrow: string
  title: string
  metricLabel: string
  format: MetricFormat
  icon: ComponentType<{ className?: string }>
  iconClass: string
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
  { key: 'schedule_count_total', eyebrow: '日程', title: '营销日程总数', metricLabel: '统计周期记录', format: 'count', icon: CalendarCheck2, iconClass: 'bg-neutral-950' },
  { key: 'seeding_session_count', eyebrow: '种草', title: '种草场次', metricLabel: '种草日程记录', format: 'count', icon: Eye, iconClass: 'bg-indigo-600' },
  { key: 'affiliate_live_session_count', eyebrow: '达播', title: '达播场次', metricLabel: '达播日程记录', format: 'count', icon: Radio, iconClass: 'bg-cyan-600' },
  { key: 'marketing_node_count', eyebrow: '节点', title: '营销节点数', metricLabel: '节点日程记录', format: 'count', icon: Flag, iconClass: 'bg-violet-600' },
  { key: 'official_activity_count', eyebrow: '官方活动', title: '官方活动数', metricLabel: '去重后的活动', format: 'count', icon: BadgeCheck, iconClass: 'bg-emerald-600' },
  { key: 'exposure_count_total', eyebrow: '种草指标', title: '总曝光数', metricLabel: '已录入曝光量', format: 'count', icon: Eye, iconClass: 'bg-blue-600' },
  { key: 'estimated_sales_amount_total', eyebrow: '达播指标', title: '预估销售额', metricLabel: '达播预估金额', format: 'currency', icon: DollarSign, iconClass: 'bg-amber-500' },
  { key: 'actual_sales_amount_total', eyebrow: '达播指标', title: '实际销售额', metricLabel: '达播实际金额', format: 'currency', icon: DollarSign, iconClass: 'bg-teal-600' },
  { key: 'quotation_amount_total', eyebrow: '种草指标', title: '报价合计', metricLabel: '种草报价金额', format: 'currency', icon: DollarSign, iconClass: 'bg-orange-500' },
  { key: 'cpm_average', eyebrow: '种草指标', title: '平均 CPM', metricLabel: '种草 CPM 均值', format: 'decimal', icon: DollarSign, iconClass: 'bg-pink-600' },
  { key: 'a3_average', eyebrow: '种草指标', title: '平均 A3', metricLabel: '种草 A3 均值', format: 'decimal', icon: DollarSign, iconClass: 'bg-rose-600' },
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

export function metricNoteClass(metric: DashboardMetric) {
  if (metric.mom_direction === 'up') return 'text-teal-600'
  if (metric.mom_direction === 'down') return 'text-rose-600'
  return 'text-muted-foreground'
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
