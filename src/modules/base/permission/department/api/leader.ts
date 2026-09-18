import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { PageList, ResponseStruct } from '@/types/api'
import type { DepartmentUserVo } from './department'

const queries = createResourceQueries('permission', 'leaders')

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
  return queries.fetch(params, querySignal =>
    http.get<ResponseStruct<PageList<LeaderRecord>>>('/admin/leader/list', { params, signal: querySignal }),
  )
}

export function create(data: LeaderVo) {
  return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/leader', data), [['permission', 'departments']])
}

export function save(id: number, data: LeaderVo) {
  return queries.mutate(
    () => http.put<ResponseStruct<null>>(`/admin/leader/${id}`, data),
    [['permission', 'departments']],
  )
}

export function deleteByDoubleKey(dept_id: number, user_ids: number[]) {
  return queries.mutate(
    () => http.delete<ResponseStruct<null>>('/admin/leader', { data: { dept_id, user_ids } }),
    [['permission', 'departments']],
  )
}
