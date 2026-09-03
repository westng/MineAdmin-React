import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'

export type ScheduleStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled'
export type BusinessType = 'seeding' | 'affiliate_live'

export interface MarketingCalendarSchedule {
  id?: number
  marketing_name: string
  marketing_type: string
  platform_channel: string
  business_type: BusinessType
  schedule_status: ScheduleStatus
  campaign_start_at: string
  campaign_end_at: string
  aweme_avatar?: string | null
  aweme_name?: string | null
  aweme_id?: string | null
  aweme_show_id?: string | null
  shop_id: string
  exposure_count?: number | null
  quotation_amount?: string | null
  cpm?: string | null
  a3?: string | null
  estimated_sales_amount?: string | null
  actual_sales_amount?: string | null
  online_commission_rate?: string | null
  offline_commission_rate?: string | null
  slot_fee?: string | null
  activity_content?: string | null
  remark?: string | null
  created_by?: number
  updated_by?: number
  created_at?: string | null
  updated_at?: string | null
}

export interface MarketingCalendarDictionaryItem {
  value: string
  label: string
  metric_profile?: string
}

export interface MarketingCalendarDictionaries {
  marketing_types: MarketingCalendarDictionaryItem[]
  platform_channels: MarketingCalendarDictionaryItem[]
  business_types: MarketingCalendarDictionaryItem[]
  schedule_statuses: MarketingCalendarDictionaryItem[]
}

export interface ScheduleListParams {
  page?: number
  page_size?: number
  range_start?: string
  range_end?: string
  keyword?: string
  shop_id?: string
  aweme_name?: string
  aweme_id?: string
  aweme_show_id?: string
  platform_channel?: string[]
  business_type?: string[]
  marketing_type?: string[]
  schedule_status?: string[]
}

export function page(params: ScheduleListParams = {}) {
  return http.get<ResponseStruct<PageList<MarketingCalendarSchedule>>>('/admin/marketing/calendar', { params })
}

export function detail(id: number) {
  return http.get<ResponseStruct<MarketingCalendarSchedule>>(`/admin/marketing/calendar/${id}`)
}

export function create(data: MarketingCalendarSchedule) {
  return http.post<ResponseStruct<MarketingCalendarSchedule>>('/admin/marketing/calendar', data)
}

export function update(id: number, data: Partial<MarketingCalendarSchedule>) {
  return http.put<ResponseStruct<MarketingCalendarSchedule>>(`/admin/marketing/calendar/${id}`, data)
}

export function remove(id: number) {
  return http.delete<ResponseStruct<null>>(`/admin/marketing/calendar/${id}`)
}

export function updateStatus(id: number, schedule_status: ScheduleStatus) {
  return http.patch<ResponseStruct<MarketingCalendarSchedule>>(`/admin/marketing/calendar/${id}/status`, { schedule_status })
}

export function dictionaries() {
  return http.get<ResponseStruct<MarketingCalendarDictionaries>>('/admin/marketing/calendar/dictionaries')
}
