import type { PageList, ResponseStruct } from '@/types/api'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export type RoleVo = {
  id?: number
  name?: string
  code?: string
  data_scope?: number
  status?: number
  sort?: number
  remark?: string
}

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('permission', 'roles')

  const page = queries.list(
    (params: { name?: string; code?: string; status?: number; [key: string]: unknown }, querySignal) =>
      http.get<ResponseStruct<PageList<RoleVo>>>('/admin/role/list', { params, signal: querySignal }),
  )

  function create(data: RoleVo) {
    return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/role', data))
  }

  function save(id: number, data: RoleVo) {
    return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/role/${id}`, data))
  }

  function deleteByIds(ids: number[]) {
    return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/role', { data: ids }))
  }

  function getRolePermission(id: number) {
    return queries.detail(id, querySignal =>
      http.get<ResponseStruct<null>>(`/admin/role/${id}/permissions`, { signal: querySignal }),
    )
  }

  function setRolePermission(id: number, permissions: string[]) {
    return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/role/${id}/permissions`, { permissions }))
  }

  return { page, create, save, deleteByIds, getRolePermission, setRolePermission }
}
