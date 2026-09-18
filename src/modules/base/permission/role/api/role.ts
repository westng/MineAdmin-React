import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { PageList, ResponseStruct } from '@/types/api'

const queries = createResourceQueries('permission', 'roles')

export type RoleVo = {
  id?: number
  name?: string
  code?: string
  data_scope?: number
  status?: number
  sort?: number
  remark?: string
}

export function page(params: { name?: string; code?: string; status?: number; [key: string]: unknown } = {}) {
  return queries.fetch(params, querySignal =>
    http.get<ResponseStruct<PageList<RoleVo>>>('/admin/role/list', { params, signal: querySignal }),
  )
}

export function create(data: RoleVo) {
  return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/role', data))
}

export function save(id: number, data: RoleVo) {
  return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/role/${id}`, data))
}

export function deleteByIds(ids: number[]) {
  return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/role', { data: ids }))
}

export function getRolePermission(id: number) {
  return queries.detail(id, querySignal =>
    http.get<ResponseStruct<null>>(`/admin/role/${id}/permissions`, { signal: querySignal }),
  )
}

export function setRolePermission(id: number, permissions: string[]) {
  return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/role/${id}/permissions`, { permissions }))
}
