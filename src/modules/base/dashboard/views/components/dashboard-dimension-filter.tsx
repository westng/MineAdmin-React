import { ChevronDown, Filter, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { MarketingScheduleDictionaries } from '@/modules/marketing/schedule/api/schedule'

export type DashboardDimensionFilters = {
  platform_channel: string[]
  business_type: string[]
}

export type DashboardFilterOptions = Pick<MarketingScheduleDictionaries, 'platform_channels' | 'business_types'>

export default function DashboardDimensionFilter({
  filters,
  options,
  loading,
  error,
  onRetry,
  onChange,
}: {
  filters: DashboardDimensionFilters
  options: DashboardFilterOptions
  loading: boolean
  error: boolean
  onRetry: () => void
  onChange: (patch: Partial<DashboardDimensionFilters>) => void
}) {
  const renderOptions = (key: keyof DashboardDimensionFilters, items: DashboardFilterOptions['platform_channels']) => (
    <div className="space-y-1">
      {items.length > 0 ? items.map(option => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted">
          <Checkbox
            checked={filters[key].includes(option.value)}
            onCheckedChange={checked => onChange({ [key]: checked ? [...filters[key], option.value] : filters[key].filter(value => value !== option.value) })}
            aria-label={option.label}
          />
          <span>{option.label}</span>
        </label>
      )) : <p className="px-1.5 py-2 text-sm text-muted-foreground">暂无可选项</p>}
    </div>
  )

  const menus: Array<{ key: keyof DashboardDimensionFilters; label: string; items: DashboardFilterOptions['platform_channels'] }> = [
    { key: 'platform_channel', label: '平台渠道', items: options.platform_channels },
    { key: 'business_type', label: '业务类型', items: options.business_types },
  ]

  return (
    <>
      {menus.map(menu => {
        const activeCount = filters[menu.key].length
        return (
          <Popover key={menu.key}>
            <PopoverTrigger
              render={<Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 whitespace-nowrap" aria-label={`筛选${menu.label}`} />}
            >
              <Filter className="size-3.5" aria-hidden="true" />
              <span>{menu.label}</span>
              {activeCount > 0 && <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[0.65rem]">{activeCount}</Badge>}
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
              {loading ? <p className="py-4 text-center text-sm text-muted-foreground">加载筛选项…</p> : error ? (
                <div className="flex flex-col items-center gap-2 py-3 text-center text-sm text-muted-foreground">
                  <p>筛选项加载失败</p>
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>重试</Button>
                </div>
              ) : (
                <>
                  <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">{menu.label}</div>
                  {renderOptions(menu.key, menu.items)}
                </>
              )}
              {activeCount > 0 && !loading && (
                <Button type="button" variant="ghost" size="sm" className="mt-3 w-full justify-start px-1.5 text-muted-foreground" onClick={() => onChange({ [menu.key]: [] })}>
                  <X className="size-3.5" aria-hidden="true" />清除{menu.label}筛选
                </Button>
              )}
            </PopoverContent>
          </Popover>
        )
      })}
    </>
  )
}
