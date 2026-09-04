import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'

export interface RoleVo {
  id?: number
  name?: string
  code?: string
  data_scope?: number
  status?: number
  sort?: number
  remark?: string
}

export function page(params: { name?: string; code?: string; status?: number; [key: string]: unknown } = {}) {
  return http.get<ResponseStruct<PageList<RoleVo>>>('/admin/role/list', { params })
}

export function create(data: RoleVo) {
  return http.post<ResponseStruct<null>>('/admin/role', data)
}

export function save(id: number, data: RoleVo) {
  return http.put<ResponseStruct<null>>(`/admin/role/${id}`, data)
}

export function deleteByIds(ids: number[]) {
  return http.delete<ResponseStruct<null>>('/admin/role', { data: ids })
}

export function getRolePermission(id: number) {
  return http.get<ResponseStruct<null>>(`/admin/role/${id}/permissions`)
}

export function setRolePermission(id: number, permissions: string[]) {
  return http.put<ResponseStruct<null>>(`/admin/role/${id}/permissions`, { permissions })
}
