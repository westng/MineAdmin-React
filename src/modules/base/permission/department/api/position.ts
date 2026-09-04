import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'

export interface PositionVo {
  id?: number
  dept_id?: number
  dept_name?: string
  name?: string
  [key: string]: unknown
}

export function page(params: { name?: string } = {}) {
  return http.get<ResponseStruct<PageList<PositionVo>>>('/admin/position/list', { params })
}

export function create(data: PositionVo) {
  return http.post<ResponseStruct<null>>('/admin/position', data)
}

export function save(id: number, data: PositionVo) {
  return http.put<ResponseStruct<null>>(`/admin/position/${id}`, data)
}

export function setDataScope(id: number, data: PositionVo) {
  return http.put<ResponseStruct<null>>(`/admin/position/${id}/data_permission`, data)
}

export function deleteByIds(ids: number[]) {
  return http.delete<ResponseStruct<null>>('/admin/position', { data: ids })
}
