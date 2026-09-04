import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'

export type DashboardMomDirection = 'up' | 'down' | 'flat'

export interface DashboardMetric {
  value: number | string | null
  previous_value: number | string | null
  mom_rate: number | null
  mom_direction: DashboardMomDirection
}

export interface DashboardOverviewParams {
  range_start?: string
  range_end?: string
  platform_channel?: string[]
  marketing_type?: string[]
  business_type?: string[]
  schedule_status?: string[]
  shop_id?: string
  aweme_name?: string
  aweme_id?: string
  aweme_show_id?: string
  official_activity_id?: string
}

export interface DashboardOverviewTrendItem {
  date: string
  schedule_count: number
  exposure_count_total: number | null
  estimated_sales_amount_total: string | null
  actual_sales_amount_total: string | null
}

export interface DashboardPlatformDistributionItem {
  platform_channel: string
  count: number
  exposure_count_total: number | null
  estimated_sales_amount_total: string | null
  actual_sales_amount_total: string | null
}

export interface DashboardMarketingTypeDistributionItem {
  marketing_type: string
  count: number
}

export interface DashboardStatusDistributionItem {
  schedule_status: string
  count: number
}

export interface DashboardOverview {
  period: {
    start: string
    end: string
  }
  comparison_period: {
    start: string
    end: string
  }
  summary: Record<string, DashboardMetric>
  status_distribution: DashboardStatusDistributionItem[]
  platform_distribution: DashboardPlatformDistributionItem[]
  marketing_type_distribution: DashboardMarketingTypeDistributionItem[]
  trend: DashboardOverviewTrendItem[]
}

export function overview(params: DashboardOverviewParams = {}) {
  return http.get<ResponseStruct<DashboardOverview>>('/admin/dashboard/overview', { params })
}
