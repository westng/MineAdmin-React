import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Check, Filter, Plus, RefreshCw, Search, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/reui/alert'
import {
  EventCalendar,
  useEventCalendarState,
  type EventCalendarInstance,
  type EventCalendarRenderEventProps,
} from '@/components/reui/event-calendar/event-calendar'
import { EventCalendarContent } from '@/components/reui/event-calendar/event-calendar-content'
import {
  EventCalendarDatePicker,
  EventCalendarNav,
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarNavToday,
  EventCalendarTitle,
  EventCalendarToolbar,
  EventCalendarViewSwitcher,
} from '@/components/reui/event-calendar/event-calendar-nav'
import type { CalendarEvent } from '@/components/reui/event-calendar/event-calendar-types'
import type { EventCalendarDateRange } from '@/components/reui/event-calendar/event-calendar-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { extractList } from '@/modules/base/utils/api-data'
import * as scheduleApi from '@/modules/marketing/calendar/api/schedule'
import type { MarketingCalendarDictionaries, MarketingCalendarSchedule, ScheduleStatus } from '@/modules/marketing/calendar/api/schedule'
import { cn } from '@/lib/utils'

const statusLabels: Record<ScheduleStatus, string> = {
  draft: '草稿',
  planned: '待执行',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

function statusLabel(value?: string | null) {
  return value && statusLabels[value as ScheduleStatus] ? statusLabels[value as ScheduleStatus] : '未知状态'
}

function statusVariant(value?: string | null): 'outline' | 'warning' {
  return value && statusLabels[value as ScheduleStatus] ? 'outline' : 'warning'
}

const emptyDictionaries: MarketingCalendarDictionaries = {
  marketing_types: [
    { value: 'shopping_festival', label: '大促' },
    { value: 'node_campaign', label: '节点营销' },
    { value: 'brand_campaign', label: '品牌活动' },
  ],
  platform_channels: [
    { value: 'taobao', label: '淘宝' },
    { value: 'tmall', label: '天猫' },
    { value: 'jd', label: '京东' },
    { value: 'pinduoduo', label: '拼多多' },
    { value: 'douyin', label: '抖音' },
  ],
  business_types: [
    { value: 'affiliate_live', label: '达播', metric_profile: 'sales' },
    { value: 'seeding', label: '种草', metric_profile: 'exposure_quotation_cpm_a3' },
  ],
  schedule_statuses: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
}

type ScheduleFilters = {
  keyword: string
  shop_id: string
  aweme_name: string
  aweme_id: string
  aweme_show_id: string
  platform_channel: string[]
  marketing_type: string[]
  business_type: string[]
  schedule_status: string[]
}

type ScheduleFormValues = {
  marketing_name: string
  marketing_type: string
  platform_channel: string
  business_type: scheduleApi.BusinessType
  schedule_status: ScheduleStatus
  campaign_start_at: string
  campaign_end_at: string
  aweme_avatar: string
  aweme_name: string
  aweme_id: string
  aweme_show_id: string
  shop_id: string
  exposure_count: string
  quotation_amount: string
  cpm: string
  a3: string
  estimated_sales_amount: string
  actual_sales_amount: string
  online_commission_rate: string
  offline_commission_rate: string
  slot_fee: string
  activity_content: string
  remark: string
}

const emptyFilters: ScheduleFilters = {
  keyword: '',
  shop_id: '',
  aweme_name: '',
  aweme_id: '',
  aweme_show_id: '',
  platform_channel: [],
  marketing_type: [],
  business_type: [],
  schedule_status: [],
}

function emptyForm(start?: Date): ScheduleFormValues {
  const startValue = start ? format(start, "yyyy-MM-dd'T'HH:mm") : ''
  const endValue = start ? format(new Date(start.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") : ''
  return {
    marketing_name: '',
    marketing_type: 'shopping_festival',
    platform_channel: 'douyin',
    business_type: 'seeding',
    schedule_status: 'draft',
    campaign_start_at: startValue,
    campaign_end_at: endValue,
    aweme_avatar: '',
    aweme_name: '',
    aweme_id: '',
    aweme_show_id: '',
    shop_id: '',
    exposure_count: '',
    quotation_amount: '',
    cpm: '',
    a3: '',
    estimated_sales_amount: '',
    actual_sales_amount: '',
    online_commission_rate: '',
    offline_commission_rate: '',
    slot_fee: '',
    activity_content: '',
    remark: '',
  }
}

function inputDate(value?: string | null) {
  if (!value) return ''
  try {
    return format(parseISO(value), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ''
  }
}

function apiDate(value: string) {
  return value ? `${value}:00` : value
}

function scheduleToForm(schedule: MarketingCalendarSchedule): ScheduleFormValues {
  return {
    marketing_name: schedule.marketing_name || '',
    marketing_type: schedule.marketing_type || 'shopping_festival',
    platform_channel: schedule.platform_channel || 'douyin',
    business_type: schedule.business_type,
    schedule_status: schedule.schedule_status,
    campaign_start_at: inputDate(schedule.campaign_start_at),
    campaign_end_at: inputDate(schedule.campaign_end_at),
    aweme_avatar: schedule.aweme_avatar || '',
    aweme_name: schedule.aweme_name || '',
    aweme_id: schedule.aweme_id || '',
    aweme_show_id: schedule.aweme_show_id || '',
    shop_id: schedule.shop_id || '',
    exposure_count: schedule.exposure_count === null || schedule.exposure_count === undefined ? '' : String(schedule.exposure_count),
    quotation_amount: schedule.quotation_amount || '',
    cpm: schedule.cpm || '',
    a3: schedule.a3 || '',
    estimated_sales_amount: schedule.estimated_sales_amount || '',
    actual_sales_amount: schedule.actual_sales_amount || '',
    online_commission_rate: schedule.online_commission_rate || '',
    offline_commission_rate: schedule.offline_commission_rate || '',
    slot_fee: schedule.slot_fee || '',
    activity_content: schedule.activity_content || '',
    remark: schedule.remark || '',
  }
}

function scheduleToEvent(schedule: MarketingCalendarSchedule): CalendarEvent<MarketingCalendarSchedule> | null {
  if (!schedule.id || !schedule.campaign_start_at || !schedule.campaign_end_at) return null
  const start = parseISO(schedule.campaign_start_at)
  let end = parseISO(schedule.campaign_end_at)
  if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 30 * 60 * 1000)
  const color = schedule.business_type === 'seeding' ? 'var(--color-cyan-500)' : 'var(--color-blue-600)'
  return {
    id: String(schedule.id),
    title: schedule.marketing_name,
    start,
    end,
    color,
    data: schedule,
  }
}

function displayLabel(options: Array<{ value: string; label: string }>, value?: string | null) {
  return options.find(option => option.value === value)?.label || value || '-'
}

function formatMetric(value?: string | number | null, suffix = '') {
  if (value === null || value === undefined || value === '') return '未录入'
  return `${value}${suffix}`
}

function FilterMenu({
  label,
  values,
  options,
  onChange,
}: {
  label: string
  values: string[]
  options: Array<{ value: string; label: string }>
  onChange: (values: string[]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Filter className="size-3.5" aria-hidden="true" />
        {label}
        {values.length > 0 && <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[0.65rem]">{values.length}</Badge>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(option => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            onCheckedChange={checked => onChange(checked ? [...values, option.value] : values.filter(value => value !== option.value))}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        {values.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => onChange([])}>
              <X className="size-3.5" aria-hidden="true" />清除筛选
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TextFilterMenu({
  label,
  filters,
  values,
  onChange,
}: {
  label: string
  filters: ScheduleFilters
  values: Array<{ key: keyof ScheduleFilters; label: string; placeholder: string }>
  onChange: (key: keyof ScheduleFilters, value: string) => void
}) {
  const activeCount = values.filter(({ key }) => filters[key]).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Filter className="size-3.5" aria-hidden="true" />
        {label}
        {activeCount > 0 && <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[0.65rem]">{activeCount}</Badge>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-3">
        <DropdownMenuLabel className="px-0">{label}</DropdownMenuLabel>
        <div className="space-y-3 pt-2">
          {values.map(({ key, label: fieldLabel, placeholder }) => (
            <Field key={key}>
              <FieldLabel>{fieldLabel}</FieldLabel>
              <Input value={String(filters[key])} onChange={event => onChange(key, event.target.value)} placeholder={placeholder} className="h-8" />
            </Field>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ScheduleEventContent({ occurrence }: EventCalendarRenderEventProps<MarketingCalendarSchedule>) {
  const schedule = occurrence.event.data
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true" />
      <span className="truncate font-medium">{schedule?.marketing_name || occurrence.event.title}</span>
    </span>
  )
}

function ScheduleTooltip({ occurrence, dictionaries }: { occurrence: EventCalendarRenderEventProps<MarketingCalendarSchedule>['occurrence']; dictionaries: MarketingCalendarDictionaries }) {
  const schedule = occurrence.event.data
  if (!schedule) return null
  return (
    <div className="w-80 space-y-3 p-1 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{schedule.marketing_name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{inputDate(schedule.campaign_start_at).replace('T', ' ')} · {inputDate(schedule.campaign_end_at).replace('T', ' ')}</p>
        </div>
        <Badge variant={statusVariant(schedule.schedule_status)}>{statusLabel(schedule.schedule_status)}</Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">平台</dt><dd>{displayLabel(dictionaries.platform_channels, schedule.platform_channel)}</dd>
        <dt className="text-muted-foreground">业务</dt><dd>{displayLabel(dictionaries.business_types, schedule.business_type)}</dd>
        <dt className="text-muted-foreground">达人</dt><dd>{schedule.aweme_name || '未填写'}</dd>
        <dt className="text-muted-foreground">店铺</dt><dd className="truncate">{schedule.shop_id}</dd>
        {schedule.business_type === 'seeding' ? (
          <>
            <dt className="text-muted-foreground">曝光量</dt><dd>{formatMetric(schedule.exposure_count)}</dd>
            <dt className="text-muted-foreground">报价 / CPM</dt><dd>{formatMetric(schedule.quotation_amount)} / {formatMetric(schedule.cpm)}</dd>
          </>
        ) : (
          <>
            <dt className="text-muted-foreground">预估销售额</dt><dd>{formatMetric(schedule.estimated_sales_amount, ' CNY')}</dd>
            <dt className="text-muted-foreground">实际销售额</dt><dd>{formatMetric(schedule.actual_sales_amount, ' CNY')}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words">{value || '-'}</dd></>
}

function ScheduleDetail({
  schedule,
  dictionaries,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  schedule: MarketingCalendarSchedule
  dictionaries: MarketingCalendarDictionaries
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (value: ScheduleStatus) => void
}) {
  const metrics = schedule.business_type === 'seeding'
    ? [['曝光量', formatMetric(schedule.exposure_count)], ['报价', formatMetric(schedule.quotation_amount, ' CNY')], ['CPM', formatMetric(schedule.cpm, ' CNY')], ['A3', formatMetric(schedule.a3)]]
    : [['预估销售额', formatMetric(schedule.estimated_sales_amount, ' CNY')], ['实际销售额', formatMetric(schedule.actual_sales_amount, ' CNY')], ['线上佣金比例', formatMetric(schedule.online_commission_rate, '%')], ['线下佣金比例', formatMetric(schedule.offline_commission_rate, '%')], ['坑位费', formatMetric(schedule.slot_fee, ' CNY')]]
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-7">
            <div className="min-w-0">
              <DialogTitle className="truncate">{schedule.marketing_name}</DialogTitle>
              <DialogDescription>营销日历日程详情</DialogDescription>
            </div>
            <Badge variant={statusVariant(schedule.schedule_status)}>{statusLabel(schedule.schedule_status)}</Badge>
          </div>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <Avatar size="lg">
              {schedule.aweme_avatar && <AvatarImage src={schedule.aweme_avatar} alt={schedule.aweme_name || '达人头像'} />}
              <AvatarFallback>{schedule.aweme_name?.slice(0, 1) || '达'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{schedule.aweme_name || '未填写达人'}</p>
              <p className="truncate text-xs text-muted-foreground">{schedule.aweme_show_id || schedule.aweme_id || '未填写抖音号'}</p>
            </div>
            <Select value={schedule.schedule_status} onValueChange={value => onStatusChange(value as ScheduleStatus)}>
              <SelectTrigger className="ml-auto w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{dictionaries.schedule_statuses.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm sm:grid-cols-[140px_1fr_auto_1fr]">
            <DetailRow label="营销类型" value={displayLabel(dictionaries.marketing_types, schedule.marketing_type)} />
            <DetailRow label="平台渠道" value={displayLabel(dictionaries.platform_channels, schedule.platform_channel)} />
            <DetailRow label="业务类型" value={displayLabel(dictionaries.business_types, schedule.business_type)} />
            <DetailRow label="店铺 ID" value={schedule.shop_id} />
            <DetailRow label="开始时间" value={schedule.campaign_start_at} />
            <DetailRow label="结束时间" value={schedule.campaign_end_at} />
            <DetailRow label="达人 UID" value={schedule.aweme_id || '-'} />
            <DetailRow label="抖音号" value={schedule.aweme_show_id || '-'} />
            {metrics.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
            <DetailRow label="创建人" value={schedule.created_by ? String(schedule.created_by) : '-'} />
            <DetailRow label="创建时间" value={schedule.created_at || '-'} />
            <DetailRow label="更新人" value={schedule.updated_by ? String(schedule.updated_by) : '-'} />
            <DetailRow label="更新时间" value={schedule.updated_at || '-'} />
          </dl>
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">活动内容</p><p className="mt-1 whitespace-pre-wrap text-sm">{schedule.activity_content || '未填写'}</p></div>
            <div><p className="text-xs text-muted-foreground">备注</p><p className="mt-1 whitespace-pre-wrap text-sm">{schedule.remark || '未填写'}</p></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={onDelete}>删除</Button>
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button onClick={onEdit}>编辑日程</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleForm({
  form,
  dictionaries,
  editing,
  onChange,
  onSubmit,
  onClose,
}: {
  form: ScheduleFormValues
  dictionaries: MarketingCalendarDictionaries
  editing: boolean
  onChange: (patch: Partial<ScheduleFormValues>) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const isSeeding = form.business_type === 'seeding'
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑营销日程' : '新建营销日程'}</DialogTitle>
          <DialogDescription>保存营销日历日程表记录；活动表数据在独立模块维护。</DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field><FieldLabel>营销名称 *</FieldLabel><Input value={form.marketing_name} onChange={event => onChange({ marketing_name: event.target.value })} placeholder="例如：双十一达人专场" /></Field>
          <Field><FieldLabel>营销类型 *</FieldLabel><Select value={form.marketing_type} onValueChange={value => onChange({ marketing_type: value || '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dictionaries.marketing_types.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field><FieldLabel>平台渠道 *</FieldLabel><Select value={form.platform_channel} onValueChange={value => onChange({ platform_channel: value || '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dictionaries.platform_channels.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field><FieldLabel>业务类型 *</FieldLabel><Select value={form.business_type} onValueChange={value => {
            const businessType = (value || 'seeding') as scheduleApi.BusinessType
            onChange({
              business_type: businessType,
              ...(businessType === 'seeding'
                ? { estimated_sales_amount: '', actual_sales_amount: '', online_commission_rate: '', offline_commission_rate: '', slot_fee: '' }
                : { exposure_count: '', quotation_amount: '', cpm: '', a3: '' }),
            })
          }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dictionaries.business_types.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field><FieldLabel>开始时间 *</FieldLabel><Input type="datetime-local" value={form.campaign_start_at} onChange={event => onChange({ campaign_start_at: event.target.value })} /></Field>
          <Field><FieldLabel>结束时间 *</FieldLabel><Input type="datetime-local" value={form.campaign_end_at} onChange={event => onChange({ campaign_end_at: event.target.value })} /></Field>
          <Field><FieldLabel>店铺 ID *</FieldLabel><Input value={form.shop_id} onChange={event => onChange({ shop_id: event.target.value })} placeholder="按字符串录入，不会转科学计数法" /></Field>
          <Field><FieldLabel>日程状态</FieldLabel><Select value={form.schedule_status} onValueChange={value => onChange({ schedule_status: (value || 'draft') as ScheduleStatus })}><SelectTrigger disabled={editing}><SelectValue /></SelectTrigger><SelectContent>{dictionaries.schedule_statuses.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
        </FieldGroup>
        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-semibold">达人信息</p>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field><FieldLabel>达人头像 URL</FieldLabel><Input value={form.aweme_avatar} onChange={event => onChange({ aweme_avatar: event.target.value })} placeholder="可选" /></Field>
            <Field><FieldLabel>达人名字</FieldLabel><Input value={form.aweme_name} onChange={event => onChange({ aweme_name: event.target.value })} /></Field>
            <Field><FieldLabel>达人 UID</FieldLabel><Input value={form.aweme_id} onChange={event => onChange({ aweme_id: event.target.value })} placeholder="aweme_xxxx，按字符串保存" /></Field>
            <Field><FieldLabel>抖音号</FieldLabel><Input value={form.aweme_show_id} onChange={event => onChange({ aweme_show_id: event.target.value })} /></Field>
          </FieldGroup>
        </div>
        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-semibold">{isSeeding ? '种草指标' : '达播指标'}</p>
          {isSeeding ? (
            <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field><FieldLabel>曝光量 *</FieldLabel><Input type="number" min="0" value={form.exposure_count} onChange={event => onChange({ exposure_count: event.target.value })} /></Field>
              <Field><FieldLabel>报价 *</FieldLabel><Input type="number" min="0" step="0.01" value={form.quotation_amount} onChange={event => onChange({ quotation_amount: event.target.value })} /></Field>
              <Field><FieldLabel>CPM *</FieldLabel><Input type="number" min="0" step="0.01" value={form.cpm} onChange={event => onChange({ cpm: event.target.value })} /></Field>
              <Field><FieldLabel>A3 *</FieldLabel><Input type="number" min="0" step="0.01" value={form.a3} onChange={event => onChange({ a3: event.target.value })} /></Field>
            </FieldGroup>
          ) : (
            <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field><FieldLabel>预估销售额 *</FieldLabel><Input type="number" min="0" step="0.01" value={form.estimated_sales_amount} onChange={event => onChange({ estimated_sales_amount: event.target.value })} /></Field>
              <Field><FieldLabel>实际销售额</FieldLabel><Input type="number" min="0" step="0.01" value={form.actual_sales_amount} onChange={event => onChange({ actual_sales_amount: event.target.value })} placeholder="可在结束后补录" /></Field>
              <Field><FieldLabel>坑位费 *</FieldLabel><Input type="number" min="0" step="0.01" value={form.slot_fee} onChange={event => onChange({ slot_fee: event.target.value })} /></Field>
              <Field><FieldLabel>线上佣金比例 *</FieldLabel><Input type="number" min="0" max="100" step="0.01" value={form.online_commission_rate} onChange={event => onChange({ online_commission_rate: event.target.value })} /></Field>
              <Field><FieldLabel>线下佣金比例 *</FieldLabel><Input type="number" min="0" max="100" step="0.01" value={form.offline_commission_rate} onChange={event => onChange({ offline_commission_rate: event.target.value })} /></Field>
            </FieldGroup>
          )}
        </div>
        <FieldGroup className="grid gap-4 border-t pt-4 md:grid-cols-2">
          <Field><FieldLabel>活动内容</FieldLabel><Textarea value={form.activity_content} onChange={event => onChange({ activity_content: event.target.value })} rows={4} /></Field>
          <Field><FieldLabel>备注</FieldLabel><Textarea value={form.remark} onChange={event => onChange({ remark: event.target.value })} rows={4} /></Field>
        </FieldGroup>
        <DialogFooter><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={onSubmit}>{editing ? '保存修改' : '创建日程'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function MarketingCalendarPage() {
  const [schedules, setSchedules] = useState<MarketingCalendarSchedule[]>([])
  const [dictionaries, setDictionaries] = useState<MarketingCalendarDictionaries>(emptyDictionaries)
  const [filters, setFilters] = useState<ScheduleFilters>(emptyFilters)
  const filtersRef = useRef(filters)
  const calendarRef = useRef<EventCalendarInstance<MarketingCalendarSchedule> | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingCalendarSchedule | null>(null)
  const [form, setForm] = useState<ScheduleFormValues>(emptyForm())
  const [details, setDetails] = useState<MarketingCalendarSchedule | null>(null)

  const loadSchedules = useCallback(async (range?: EventCalendarDateRange) => {
    setLoading(true)
    try {
      const response = await scheduleApi.page({
        ...filtersRef.current,
        page: 1,
        page_size: 200,
        range_start: range ? format(range.start, 'yyyy-MM-dd HH:mm:ss') : undefined,
        range_end: range ? format(range.end, 'yyyy-MM-dd HH:mm:ss') : undefined,
      })
      const list = extractList<MarketingCalendarSchedule>(response.data.data)
      setSchedules(list)
      calendarRef.current?.api.setEvents(list.flatMap(schedule => {
        const event = scheduleToEvent(schedule)
        return event ? [event] : []
      }))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '日程加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const calendar = useEventCalendarState<MarketingCalendarSchedule>({
    defaultView: 'month',
    loading,
    timeZone: 'Asia/Shanghai',
    defaultInteractions: { drag: true, resize: true, selectSlot: true },
    onRangeChange: info => { void loadSchedules(info.range) },
    onSlotClick: slot => { setEditing(null); setForm(emptyForm(slot.date)); setFormOpen(true) },
    onEventClick: occurrence => { if (occurrence.event.data) setDetails(occurrence.event.data) },
    onEventUpdate: update => {
      const schedule = update.event.data
      if (!schedule?.id) return false
      void scheduleApi.update(schedule.id, {
        ...schedule,
        campaign_start_at: apiDate(format(update.start, "yyyy-MM-dd'T'HH:mm")),
        campaign_end_at: apiDate(format(update.end, "yyyy-MM-dd'T'HH:mm")),
      }).then(() => loadSchedules(calendar.getState().visibleRange)).catch(error => setNotice(error instanceof Error ? error.message : '日程时间更新失败'))
      return { start: update.start, end: update.end }
    },
    i18n: {
      labels: { today: '今天', previous: '上一个', next: '下一个', addEvent: '新建日程', noEvents: '暂无日程', loading: '加载中…' },
      viewNames: { month: '月', week: '周', day: '日', days: count => `${count}天`, agenda: '议程', resource: '时间网格' },
      formats: { monthTitle: 'yyyy年M月', dayTitle: 'yyyy年M月d日 EEEE', monthDayHeader: 'EEE', monthDayHeaderNarrow: 'EEEEE', timeGridDayHeader: 'M月d日 EEE', agendaDayHeader: 'yyyy年M月d日 EEEE', eventTime: 'HH:mm', timeGutter: 'HH:mm', timeGutterMinute: 'HH:mm' },
    },
  })
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    calendarRef.current = calendar
  }, [calendar])

  useEffect(() => {
    void scheduleApi.dictionaries().then(response => setDictionaries(response.data.data || emptyDictionaries)).catch(() => setDictionaries(emptyDictionaries))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSchedules(calendar.getState().visibleRange), 0)
    return () => window.clearTimeout(timer)
  }, [calendar, filters, loadSchedules])

  const submitForm = async () => {
    if (!form.marketing_name.trim() || !form.shop_id.trim() || !form.campaign_start_at || !form.campaign_end_at) {
      setNotice('请填写营销名称、店铺 ID、开始时间和结束时间')
      return
    }
    if (!form.aweme_name && (form.aweme_id || form.aweme_show_id)) {
      setNotice('填写达人 UID 或抖音号时，达人名字不能为空')
      return
    }
    if (form.aweme_name && (!form.aweme_id || !form.aweme_show_id)) {
      setNotice('达人名字、达人 UID 和抖音号需要成组填写')
      return
    }
    const metricRequired = form.business_type === 'seeding'
      ? [form.exposure_count, form.quotation_amount, form.cpm, form.a3]
      : [form.estimated_sales_amount, form.online_commission_rate, form.offline_commission_rate, form.slot_fee]
    if (metricRequired.some(value => value === '')) {
      setNotice('请填写当前业务类型对应的全部指标')
      return
    }
    const payload: Partial<MarketingCalendarSchedule> = {
      marketing_name: form.marketing_name.trim(),
      marketing_type: form.marketing_type,
      platform_channel: form.platform_channel,
      business_type: form.business_type,
      ...(editing ? {} : { schedule_status: form.schedule_status }),
      campaign_start_at: apiDate(form.campaign_start_at),
      campaign_end_at: apiDate(form.campaign_end_at),
      aweme_avatar: form.aweme_avatar || null,
      aweme_name: form.aweme_name || null,
      aweme_id: form.aweme_id || null,
      aweme_show_id: form.aweme_show_id || null,
      shop_id: form.shop_id,
      activity_content: form.activity_content || null,
      remark: form.remark || null,
      ...(form.business_type === 'seeding' ? {
        exposure_count: Number(form.exposure_count),
        quotation_amount: form.quotation_amount,
        cpm: form.cpm,
        a3: form.a3,
      } : {
        estimated_sales_amount: form.estimated_sales_amount,
        actual_sales_amount: form.actual_sales_amount || null,
        online_commission_rate: form.online_commission_rate,
        offline_commission_rate: form.offline_commission_rate,
        slot_fee: form.slot_fee,
      }),
    }
    try {
      if (editing?.id) await scheduleApi.update(editing.id, payload)
      else await scheduleApi.create(payload as MarketingCalendarSchedule)
      setFormOpen(false)
      setNotice(editing ? '日程更新成功' : '日程创建成功')
      await loadSchedules(calendar.getState().visibleRange)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '日程保存失败')
    }
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true) }
  const openEdit = (schedule: MarketingCalendarSchedule) => { setDetails(null); setEditing(schedule); setForm(scheduleToForm(schedule)); setFormOpen(true) }
  const deleteSchedule = async (schedule: MarketingCalendarSchedule) => {
    if (!schedule.id || !window.confirm(`确认删除“${schedule.marketing_name}”吗？`)) return
    try {
      await scheduleApi.remove(schedule.id)
      setDetails(null)
      setNotice('日程删除成功')
      await loadSchedules(calendar.getState().visibleRange)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '日程删除失败')
    }
  }

  const changeStatus = async (schedule: MarketingCalendarSchedule, value: ScheduleStatus) => {
    if (!schedule.id || schedule.schedule_status === value) return
    try {
      const response = await scheduleApi.updateStatus(schedule.id, value)
      const next = response.data.data
      setDetails(next)
      setNotice('日程状态更新成功')
      await loadSchedules(calendar.getState().visibleRange)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '日程状态更新失败')
    }
  }

  const visibleCount = useMemo(() => schedules.length, [schedules.length])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2"><CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" /><h2 className="text-xl font-semibold tracking-tight">营销日历</h2></div>
          <p className="text-sm text-muted-foreground">统一查看跨平台营销日程，直接维护日程指标和执行状态。</p>
        </div>
        <Button onClick={openCreate}><Plus className="size-4" aria-hidden="true" />新建日程</Button>
      </div>
      {notice && <Alert variant="info" className="flex items-center gap-2"><Check className="size-4" aria-hidden="true" /><AlertDescription className="flex-1">{notice}</AlertDescription><Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-3" /></Button></Alert>}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border bg-background">
        <EventCalendar
          calendar={calendar}
          renderEvent={props => <ScheduleEventContent {...props} />}
          renderAgendaEvent={props => <ScheduleEventContent {...props} />}
          renderEventTooltip={props => <ScheduleTooltip occurrence={props.occurrence} dictionaries={dictionaries} />}
          eventTooltip={{ side: 'top', delay: 250 }}
          className="min-h-[640px] text-sm"
          scrollMode="contained"
          scrollbars="custom"
          showDayAddButton
        >
          <EventCalendarNav className="border-b px-3 py-2">
            <EventCalendarNavToday />
            <EventCalendarDatePicker />
            <div className="flex items-center"><EventCalendarNavPrev /><EventCalendarNavNext /></div>
            <EventCalendarTitle className="ms-2" />
            <div className="grow" />
            <EventCalendarViewSwitcher />
          </EventCalendarNav>
          <EventCalendarToolbar className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            <div className="relative min-w-48 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={filters.keyword} onChange={event => setFilters(current => ({ ...current, keyword: event.target.value }))} placeholder="搜索营销名称或活动内容" className="h-7 pl-8 text-xs" /></div>
            <FilterMenu label="平台渠道" values={filters.platform_channel} options={dictionaries.platform_channels} onChange={values => setFilters(current => ({ ...current, platform_channel: values }))} />
            <FilterMenu label="营销类型" values={filters.marketing_type} options={dictionaries.marketing_types} onChange={values => setFilters(current => ({ ...current, marketing_type: values }))} />
            <FilterMenu label="业务类型" values={filters.business_type} options={dictionaries.business_types} onChange={values => setFilters(current => ({ ...current, business_type: values }))} />
            <FilterMenu label="日程状态" values={filters.schedule_status} options={dictionaries.schedule_statuses} onChange={values => setFilters(current => ({ ...current, schedule_status: values }))} />
            <TextFilterMenu
              label="店铺 / 达人"
              filters={filters}
              values={[
                { key: 'shop_id', label: '店铺 ID', placeholder: '按店铺 ID 搜索' },
                { key: 'aweme_name', label: '达人名字', placeholder: '按达人名字搜索' },
                { key: 'aweme_id', label: '达人 UID', placeholder: '按 aweme_id 精确搜索' },
                { key: 'aweme_show_id', label: '抖音号', placeholder: '按抖音号精确搜索' },
              ]}
              onChange={(key, value) => setFilters(current => ({ ...current, [key]: value }))}
            />
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setFilters(emptyFilters); setNotice('筛选条件已清除') }}><RefreshCw className="size-3.5" aria-hidden="true" />重置</Button>
            <span className={cn('text-xs text-muted-foreground', loading && 'animate-pulse')}>{loading ? '加载中…' : `当前 ${visibleCount} 条`}</span>
          </EventCalendarToolbar>
          <EventCalendarContent />
        </EventCalendar>
      </div>
      {details && <ScheduleDetail schedule={details} dictionaries={dictionaries} onClose={() => setDetails(null)} onEdit={() => openEdit(details)} onDelete={() => void deleteSchedule(details)} onStatusChange={value => void changeStatus(details, value)} />}
      {formOpen && <ScheduleForm form={form} dictionaries={dictionaries} editing={Boolean(editing)} onChange={patch => setForm(current => ({ ...current, ...patch }))} onSubmit={() => void submitForm()} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
