import { AlertTriangle, CalendarRange, RefreshCw, Search } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { zhCN } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/components/common/use-toast'
import { useHeaderActions } from '@/layouts/components/bars/toolbar/use-header-actions'
import * as dashboardApi from '@/modules/base/dashboard/api/dashboard'
import type { DashboardOverview, DashboardOverviewParams, DashboardOverviewTrendItem } from '@/modules/base/dashboard/api/dashboard'
import * as scheduleApi from '@/modules/marketing/schedule/api/schedule'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { marketingScheduleEventNames } from '@/modules/marketing/schedule/events'
import {
  formatMetricValue,
  formatTrendDate,
  getMetric,
  kpiDefinitions,
  numberFormatter,
  quickRange,
  quickRanges,
  scheduleStatusLabels,
  trendChartConfig,
  type BreakdownRow,
  type QuickRangeKey,
} from '../data'
import KpiCard from './dashboard-kpi-card'
import DashboardDimensionFilter, { type DashboardDimensionFilters, type DashboardFilterOptions } from './dashboard-dimension-filter'

function normalizeDashboardFilterOptions(value: unknown): DashboardFilterOptions {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const normalize = (items: unknown): DashboardFilterOptions['platform_channels'] => {
    if (!Array.isArray(items)) return []
    return items.filter((item): item is DashboardFilterOptions['platform_channels'][number] => {
      if (!item || typeof item !== 'object') return false
      const option = item as Record<string, unknown>
      return typeof option.value === 'string' && typeof option.label === 'string'
    })
  }
  return {
    platform_channels: normalize(source.platform_channels),
    business_types: normalize(source.business_types),
  }
}

function CornerMarks() {
  return (
    <>
      <span aria-hidden="true" className="absolute left-0 top-0 size-2 border-l border-t border-foreground/65" />
      <span aria-hidden="true" className="absolute bottom-0 right-0 size-2 border-b border-r border-foreground/65" />
    </>
  )
}

function TrendCard({ data }: { data: DashboardOverviewTrendItem[] }) {
  const chartData = data.map(item => ({
    date: formatTrendDate(item.date),
    scheduleCount: item.schedule_count,
    exposureCount: item.exposure_count_total,
  }))

  return (
    <Card className="relative overflow-hidden p-0 shadow-none">
      <CornerMarks />
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-sm leading-4">日程趋势</CardTitle>
            <p className="text-xs leading-4 text-muted-foreground">日程数与已录入曝光量</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-yellow-500" aria-hidden="true" />日程数</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />曝光量</span>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ChartContainer config={trendChartConfig} className="h-56 min-w-0">
            <AreaChart accessibilityLayer data={chartData} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.75} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
              <YAxis hide allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Area type="natural" dataKey="exposureCount" connectNulls={false} fill="var(--color-emerald-500, #10b981)" fillOpacity={0.14} stroke="var(--color-emerald-500, #10b981)" strokeWidth={1.25} isAnimationActive={false} />
              <Area type="natural" dataKey="scheduleCount" fill="var(--color-yellow-500, #eab308)" fillOpacity={0.14} stroke="var(--color-yellow-500, #eab308)" strokeWidth={1.25} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="grid h-56 place-items-center text-sm text-muted-foreground">当前周期暂无趋势数据</div>
        )}
      </CardContent>
    </Card>
  )
}

function DayBreakdown({ data, total }: { data: DashboardOverview; total: number }) {
  const [lens, setLens] = useState<'platform' | 'status'>('platform')
  const [search, setSearch] = useState('')
  const rows = useMemo<BreakdownRow[]>(() => {
    if (lens === 'status') {
      return data.status_distribution.map(item => ({
        bucket: scheduleStatusLabels[item.schedule_status] || item.schedule_status || '未设置',
        detail: '日程状态',
        code: item.schedule_status,
        count: item.count,
        exposureCount: null,
        estimatedSalesAmount: null,
        actualSalesAmount: null,
      }))
    }
    return data.platform_distribution.map(item => ({
      bucket: item.platform_channel || '未设置',
      detail: '平台渠道',
      code: item.platform_channel,
      count: item.count,
      exposureCount: item.exposure_count_total,
      estimatedSalesAmount: item.estimated_sales_amount_total,
      actualSalesAmount: item.actual_sales_amount_total,
    }))
  }, [data, lens])
  const filteredRows = rows.filter(row => row.bucket.toLowerCase().includes(search.toLowerCase()) || row.detail.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card className="w-full gap-0 p-0 shadow-none">
      <CardHeader className="flex flex-col items-start gap-3 border-b py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-base">日程明细</CardTitle>
          <p className="text-xs text-muted-foreground">按平台渠道或日程状态查看统计结果。</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">日程总数</span><Badge variant="secondary">{numberFormatter.format(total)}</Badge></div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={lens} onValueChange={value => setLens(value as 'platform' | 'status')}>
          <TabsList variant="line" className="gap-5 px-4 pt-2">
            <TabsTrigger value="platform" className="px-0 pb-3 text-sm">按平台</TabsTrigger>
            <TabsTrigger value="status" className="px-0 pb-3 text-sm">按状态</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2">
          <div className="relative w-full min-w-0 sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索平台或状态" aria-label="搜索平台或状态" className="pl-8" />
          </div>
        </div>
        <div className="overflow-x-auto border-t">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="h-10 border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 text-left font-medium">维度</th>
                <th className="px-4 text-right font-medium">日程数</th>
                <th className="px-4 text-right font-medium">曝光量</th>
                <th className="px-4 text-right font-medium">预估销售额</th>
                <th className="px-4 text-right font-medium">实际销售额</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? filteredRows.map(row => (
                <tr key={`${row.code}-${row.bucket}`} className="h-11 border-b last:border-0">
                  <td className="px-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{row.bucket}</span>
                      <span className="truncate text-xs text-muted-foreground">{row.detail}</span>
                    </div>
                  </td>
                  <td className="px-4 text-right tabular-nums">{numberFormatter.format(row.count)}</td>
                  <td className="px-4 text-right tabular-nums">{formatMetricValue(row.exposureCount, 'count')}</td>
                  <td className="px-4 text-right tabular-nums">{formatMetricValue(row.estimatedSalesAmount, 'currency')}</td>
                  <td className="px-4 text-right tabular-nums">{formatMetricValue(row.actualSalesAmount, 'currency')}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="h-28 px-4 text-center text-sm text-muted-foreground">当前筛选暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardLoading() {
  return (
    <div className="@container flex w-full flex-col gap-4" role="status" aria-label="加载数据">
      <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {kpiDefinitions.map(definition => <div key={definition.key} className="h-32 animate-pulse rounded-xl border bg-muted/40 motion-reduce:animate-none" />)}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-72 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  )
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="size-8 text-rose-600" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">数据加载失败</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry}><RefreshCw className="size-4" aria-hidden="true" />重试</Button>
      </CardContent>
    </Card>
  )
}

function DashboardDateFilter({ onChange }: { onChange: (params?: DashboardOverviewParams) => void }) {
  const [dateFilter, setDateFilter] = useState<DateRange>(() => quickRange('today'))
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRangeKey | null>('today')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [open, setOpen] = useState(false)

  const applyRange = useCallback((range: DateRange, quickKey: QuickRangeKey | null = null) => {
    setDateFilter(range)
    setActiveQuickRange(quickKey)
    if (range.from && range.to) {
      setOpen(false)
      onChange({
        range_start: format(range.from, 'yyyy-MM-dd'),
        range_end: format(range.to, 'yyyy-MM-dd'),
      })
    }
  }, [onChange])

  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    if (!range) return
    setDateFilter(range)
    setActiveQuickRange(null)
    if (range.from && range.to) {
      setOpen(false)
      onChange({
        range_start: format(range.from, 'yyyy-MM-dd'),
        range_end: format(range.to, 'yyyy-MM-dd'),
      })
    }
  }, [onChange])

  const label = dateFilter.from
    ? dateFilter.to
      ? `${format(dateFilter.from, 'yyyy-MM-dd')} 至 ${format(dateFilter.to, 'yyyy-MM-dd')}`
      : `${format(dateFilter.from, 'yyyy-MM-dd')}（请选择结束日期）`
    : '今天'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" aria-label="选择统计周期" />}>
        <CalendarRange className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">统计周期：{label}</span>
        <span className="max-w-24 truncate sm:hidden" title={label}>{label}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto overflow-auto p-0">
        <div className="flex max-h-[min(560px,calc(100vh-2rem))] min-w-max overflow-auto">
          <aside className="w-28 shrink-0 border-e p-2">
            <div className="space-y-0.5">
              {quickRanges.map(item => (
                <Button
                  key={item.key}
                  type="button"
                  variant={activeQuickRange === item.key ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={() => {
                    const range = quickRange(item.key)
                    setMonth(startOfMonth(range.from as Date))
                    applyRange(range, item.key)
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </aside>
          <div className="shrink-0 p-3">
            <Calendar
              mode="range"
              month={month}
              onMonthChange={setMonth}
              selected={dateFilter}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              showOutsideDays
              locale={zhCN}
              weekStartsOn={1}
              className="p-0"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function DashboardPageView() {
  const appliedParamsRef = useRef<DashboardOverviewParams>({})
  const overviewRequestIdRef = useRef(0)
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensionFilters, setDimensionFilters] = useState<DashboardDimensionFilters>({ platform_channel: [], business_type: [] })
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions>({ platform_channels: [], business_types: [] })
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true)
  const [filterOptionsError, setFilterOptionsError] = useState(false)
  const [filterOptionsRetry, setFilterOptionsRetry] = useState(0)
  const { toast } = useToast()

  const loadOverview = useCallback(async (params: DashboardOverviewParams = appliedParamsRef.current) => {
    appliedParamsRef.current = params
    const requestId = ++overviewRequestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const response = await dashboardApi.overview(params)
      if (requestId === overviewRequestIdRef.current) setData(response.data.data)
    } catch (requestError) {
      if (requestId !== overviewRequestIdRef.current) return
      const message = requestError instanceof Error ? requestError.message : '数据加载失败'
      setError(message)
      toast(message, 'destructive')
    } finally {
      if (requestId === overviewRequestIdRef.current) setLoading(false)
    }
  }, [toast])

  const handleDateFilterChange = useCallback((params?: DashboardOverviewParams) => {
    void loadOverview({ ...appliedParamsRef.current, ...params })
  }, [loadOverview])

  const handleDimensionFilterChange = useCallback((patch: Partial<DashboardDimensionFilters>) => {
    setDimensionFilters(current => ({ ...current, ...patch }))
    void loadOverview({ ...appliedParamsRef.current, ...patch })
    if (patch.platform_channel?.length === 0 && patch.business_type?.length === 0) toast('筛选条件已清除', 'success')
  }, [loadOverview, toast])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setFilterOptionsLoading(true)
      setFilterOptionsError(false)
      void scheduleApi.dictionaries()
        .then(response => {
          if (active) setFilterOptions(normalizeDashboardFilterOptions(response.data.data))
        })
        .catch(() => {
          if (active) setFilterOptionsError(true)
        })
        .finally(() => {
          if (active) setFilterOptionsLoading(false)
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [filterOptionsRetry])

  const headerActions = useMemo(() => (
    <>
      <DashboardDimensionFilter
        filters={dimensionFilters}
        options={filterOptions}
        loading={filterOptionsLoading}
        error={filterOptionsError}
        onRetry={() => setFilterOptionsRetry(current => current + 1)}
        onChange={handleDimensionFilterChange}
      />
      <DashboardDateFilter onChange={handleDateFilterChange} />
    </>
  ), [dimensionFilters, filterOptions, filterOptionsLoading, filterOptionsError, handleDateFilterChange, handleDimensionFilterChange])

  useHeaderActions(headerActions)

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOverview(), 0)
    const handleChanged = () => void loadOverview()
    window.addEventListener(marketingScheduleEventNames.changed, handleChanged)
    return () => {
      window.clearTimeout(timer)
      overviewRequestIdRef.current += 1
      window.removeEventListener(marketingScheduleEventNames.changed, handleChanged)
    }
  }, [loadOverview])

  if (loading && !data) return <DashboardLoading />
  if (error && !data) return <DashboardError message={error} onRetry={() => void loadOverview()} />
  if (!data) return <DashboardError message="暂无可展示的营销日程数据" onRetry={() => void loadOverview()} />

  const summary = data.summary
  const total = Number(getMetric(summary, 'schedule_count_total').value || 0)

  return (
    <div className="@container flex w-full flex-col gap-4 text-foreground" aria-busy={loading}>
      {error && <div className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void loadOverview()}>重试</Button></div>}
      <section aria-label="营销日程核心指标" className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {kpiDefinitions.map(definition => <KpiCard key={definition.key} definition={definition} metric={getMetric(summary, definition.key)} trend={data.trend} />)}
      </section>
      <section aria-label="营销日程趋势">
        <TrendCard data={data.trend} />
      </section>
      <section aria-label="营销日程明细">
        <DayBreakdown data={data} total={total} />
      </section>
    </div>
  )
}
