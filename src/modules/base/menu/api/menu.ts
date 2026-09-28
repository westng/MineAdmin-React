import type { ResponseStruct } from '@/types/api'

import type { MenuVo } from './permission'
export type { MenuVo } from './permission'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('permission', 'menus')

  const page = queries.list((_params: Record<string, never>, querySignal) =>
    http.get<ResponseStruct<MenuVo[]>>('/admin/menu/list', { signal: querySignal }),
  )

  function create(data: MenuVo) {
    return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/menu', data))
  }

  function save(id: number, data: MenuVo) {
    return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/menu/${id}`, data))
  }

  function deleteByIds(ids: number[]) {
    return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/menu', { data: ids }))
  }

  return { page, create, save, deleteByIds }
}
