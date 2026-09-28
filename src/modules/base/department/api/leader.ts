import type { PageList, ResponseStruct } from '@/types/api'

import type { DepartmentUserVo } from './department'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

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

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('permission', 'leaders')

  const page = queries.list(
    (params: { user_id?: string; dept_id?: number; page?: number; page_size?: number }, querySignal) =>
      http.get<ResponseStruct<PageList<LeaderRecord>>>('/admin/leader/list', { params, signal: querySignal }),
  )

  function create(data: LeaderVo) {
    return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/leader', data), [['permission', 'departments']])
  }

  function save(id: number, data: LeaderVo) {
    return queries.mutate(
      () => http.put<ResponseStruct<null>>(`/admin/leader/${id}`, data),
      [['permission', 'departments']],
    )
  }

  function deleteByDoubleKey(dept_id: number, user_ids: number[]) {
    return queries.mutate(
      () => http.delete<ResponseStruct<null>>('/admin/leader', { data: { dept_id, user_ids } }),
      [['permission', 'departments']],
    )
  }

  return { page, create, save, deleteByDoubleKey }
}
