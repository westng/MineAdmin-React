import type { PageList, ResponseStruct } from '@/types/api'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export interface PositionVo {
  id?: number
  dept_id?: number
  dept_name?: string
  name?: string
  [key: string]: unknown
}

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('permission', 'positions')

  const page = queries.list(
    (params: { name?: string; dept_id?: number; page?: number; page_size?: number }, querySignal) =>
      http.get<ResponseStruct<PageList<PositionVo>>>('/admin/position/list', { params, signal: querySignal }),
  )

  function create(data: PositionVo) {
    return queries.mutate(
      () => http.post<ResponseStruct<null>>('/admin/position', data),
      [['permission', 'departments']],
    )
  }

  function save(id: number, data: PositionVo) {
    return queries.mutate(
      () => http.put<ResponseStruct<null>>(`/admin/position/${id}`, data),
      [['permission', 'departments']],
    )
  }

  function setDataScope(id: number, data: PositionVo) {
    return queries.mutate(
      () => http.put<ResponseStruct<null>>(`/admin/position/${id}/data_permission`, data),
      [['permission', 'departments']],
    )
  }

  function deleteByIds(ids: number[]) {
    return queries.mutate(
      () => http.delete<ResponseStruct<null>>('/admin/position', { data: ids }),
      [['permission', 'departments']],
    )
  }

  return { page, create, save, setDataScope, deleteByIds }
}
