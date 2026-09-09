import { Badge } from '@/components/reui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import type { DashboardMetric, DashboardOverviewTrendItem } from '../../api/dashboard'
import { formatKpiValue, formatMetricValue, formatMomRate, getKpiChart, type KpiDefinition } from '../data'

type KpiCardProps = {
  definition: KpiDefinition
  metric: DashboardMetric
  trend: DashboardOverviewTrendItem[]
}

function KpiChart({ definition, metric, trend }: KpiCardProps) {
  const { isTrend, points } = getKpiChart(definition, metric, trend)
  const values = points.flatMap(point => point.value === null ? [] : [point.value])
  if (values.length === 0) return <span className="text-xs text-muted-foreground">暂无数据</span>

  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const y = (value: number) => max === min ? 39 : 1 + (max - value) / (max - min) * 38
  const baseline = y(0)
  const step = 64 / points.length
  const width = Math.min(14, step - 2)
  const caption = isTrend ? `近 ${points.length} 个日期` : '上期 / 本期'
  const color = metric.mom_direction === 'down' ? 'text-destructive/35' : metric.mom_direction === 'up' ? 'text-success/35' : 'text-muted-foreground/30'

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        openOnHover
        delay={200}
        closeDelay={150}
        className="w-16 shrink-0 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`查看${definition.title}的${isTrend ? '趋势' : '上期与本期对比'}数据`}
      >
        <svg viewBox="0 0 64 40" className={`h-10 w-16 ${color}`} aria-hidden="true">
          {points.map((point, index) => {
            const x = index * step + (step - width) / 2
            if (point.value === null || point.value === 0) {
              return <line key={point.label} x1={x} x2={x + width} y1={baseline} y2={baseline} stroke="currentColor" strokeDasharray={point.value === null ? '1 2' : undefined} />
            }
            return <rect key={point.label} x={x} y={Math.min(y(point.value), baseline)} width={width} height={Math.abs(y(point.value) - baseline)} rx={Math.min(1.5, width / 2)} fill="currentColor" />
          })}
        </svg>
        <span className="mt-0.5 block text-center text-[10px] leading-3 text-muted-foreground">{caption}</span>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} initialFocus={false} className="w-64 max-w-[calc(100vw-2rem)] gap-3 p-3">
        <div className="space-y-0.5">
          <PopoverTitle>{definition.title}</PopoverTitle>
          <PopoverDescription className="text-xs">{isTrend ? `最近 ${points.length} 个有记录日期` : '上期与本期对比'}</PopoverDescription>
        </div>
        <dl className="max-h-64 space-y-2 overflow-y-auto text-xs">
          {points.map(point => (
            <div key={point.label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{point.label}</dt>
              <dd className="min-w-0 text-right font-medium tabular-nums [overflow-wrap:anywhere]">{formatMetricValue(point.value, definition.format)}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}

export default function KpiCard({ definition, metric, trend }: KpiCardProps) {
  const Icon = definition.icon
  const hasValue = metric.value !== null && metric.value !== ''
  const changeVariant = metric.mom_rate === null || metric.mom_direction === 'flat'
    ? 'secondary'
    : metric.mom_direction === 'up' ? 'success-light' : 'destructive-light'
  const fullValue = formatMetricValue(metric.value, definition.format)

  return (
    <Card className="min-w-0 p-0 shadow-none">
      <CardContent className="flex h-full flex-col gap-3 p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-background bg-muted/60 shadow-sm ring-1 ring-foreground/5">
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium leading-5 [overflow-wrap:anywhere]">{definition.title}</h3>
            <p className="truncate text-xs leading-4 text-muted-foreground" title={definition.metricLabel}>{definition.metricLabel}</p>
          </div>
          <Badge variant={changeVariant} size="default" className="mt-0.5 tabular-nums" title={`较上一周期：${formatMomRate(metric.mom_rate)}`}>
            {formatMomRate(metric.mom_rate)}
          </Badge>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <p className={`min-w-0 pb-0.5 leading-8 tracking-tight tabular-nums [overflow-wrap:anywhere] ${hasValue ? 'text-2xl font-semibold' : 'text-lg font-medium text-muted-foreground'}`} title={fullValue} aria-label={fullValue}>
            {formatKpiValue(metric.value, definition.format)}
          </p>
          <KpiChart definition={definition} metric={metric} trend={trend} />
        </div>
      </CardContent>
    </Card>
  )
}
