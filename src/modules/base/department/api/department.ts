import type { PageList, ResponseStruct } from '@/types/api'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries } from '@/services/query/resource'

export interface DepartmentUserVo {
  id?: number
  username?: string
  nickname?: string
  avatar?: string
  phone?: string
  email?: string
  pivot?: { dept_id?: number; user_id?: number }
}

export interface DepartmentVo {
  id?: number
  name?: string
  parent_id?: number | null
  remark?: string | null
  created_at?: string | null
  updated_at?: string | null
  children?: DepartmentVo[]
  department_users?: DepartmentUserVo[]
  leader?: DepartmentUserVo[]
  positions?: Array<{ id?: number; name?: string }>
  [key: string]: unknown
}

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const queries = createResourceQueries(
    'permission',
    'departments',
    runtime.query,
    () => runtime.session.getState().sessionVersion,
  )

  const page = queries.list((params: { name?: string }, querySignal) =>
    http.get<ResponseStruct<PageList<DepartmentVo>>>('/admin/department/list?level=1', {
      params,
      signal: querySignal,
    }),
  )

  function create(data: DepartmentVo) {
    return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/department', data))
  }

  function save(id: number, data: DepartmentVo) {
    return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/department/${id}`, data))
  }

  function deleteByIds(ids: number[]) {
    return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/department', { data: ids }))
  }

  return { page, create, save, deleteByIds }
}
