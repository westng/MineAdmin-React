import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'
import type { DepartmentUserVo } from './department'

export interface LeaderRecord {
  dept_id: number
  user_id: number
  user?: DepartmentUserVo | null
  [key: string]: unknown
}

export interface LeaderVo {
  id?: number
  user_id?: number | number[] | null
  dept_id?: number
  dept_name?: string
  users?: Array<{ id?: number; username?: string; nickname?: string }>
}

export function page(params: { user_id?: string; dept_id?: number; page?: number; page_size?: number } = {}) {
  return http.get<ResponseStruct<PageList<LeaderRecord>>>('/admin/leader/list', { params })
}

export function create(data: LeaderVo) {
  return http.post<ResponseStruct<null>>('/admin/leader', data)
}

export function save(id: number, data: LeaderVo) {
  return http.put<ResponseStruct<null>>(`/admin/leader/${id}`, data)
}

export function deleteByDoubleKey(dept_id: number, user_ids: number[]) {
  return http.delete<ResponseStruct<null>>('/admin/leader', { data: { dept_id, user_ids } })
}
