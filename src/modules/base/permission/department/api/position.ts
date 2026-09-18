import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { PageList, ResponseStruct } from '@/types/api'

const queries = createResourceQueries('permission', 'positions')

export interface PositionVo {
  id?: number
  dept_id?: number
  dept_name?: string
  name?: string
  [key: string]: unknown
}

export function page(params: { name?: string; dept_id?: number; page?: number; page_size?: number } = {}) {
  return queries.fetch(params, querySignal =>
    http.get<ResponseStruct<PageList<PositionVo>>>('/admin/position/list', { params, signal: querySignal }),
  )
}

export function create(data: PositionVo) {
  return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/position', data), [['permission', 'departments']])
}

export function save(id: number, data: PositionVo) {
  return queries.mutate(
    () => http.put<ResponseStruct<null>>(`/admin/position/${id}`, data),
    [['permission', 'departments']],
  )
}

export function setDataScope(id: number, data: PositionVo) {
  return queries.mutate(
    () => http.put<ResponseStruct<null>>(`/admin/position/${id}/data_permission`, data),
    [['permission', 'departments']],
  )
}

export function deleteByIds(ids: number[]) {
  return queries.mutate(
    () => http.delete<ResponseStruct<null>>('/admin/position', { data: ids }),
    [['permission', 'departments']],
  )
}
