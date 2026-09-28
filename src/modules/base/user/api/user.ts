import type { PageList, ResponseStruct } from '@/types/api'

import type { UserDepartmentInfo, UserPositionInfo, UserRoleInfo } from '@/services/auth/types'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export interface UserPolicy {
  policy_type: 'DEPT_SELF' | 'DEPT_TREE' | 'ALL' | 'SELF' | 'CUSTOM_DEPT' | 'CUSTOM_FUNC'
  is_default?: boolean
  value?: unknown[]
}

export interface UserVo {
  id?: number
  username?: string
  user_type?: number
  nickname?: string
  phone?: string
  email?: string
  avatar?: string
  signed?: string
  dashboard?: string
  status?: 1 | 2
  remark?: string
  backend_setting?: unknown[]
  policy?: UserPolicy | null
  departments?: UserDepartmentInfo[]
  positions?: UserPositionInfo[]
  roles?: UserRoleInfo[]
  department?: number[]
  position?: number[]
  [key: string]: unknown
}

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('permission', 'users')

  const pageUsers = queries.list((params: Partial<UserVo>, querySignal) =>
    http.get<ResponseStruct<PageList<UserVo>>>('/admin/user/list', { params, signal: querySignal }),
  )

  function createUser(data: UserVo) {
    return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/user', data))
  }

  function saveUser(id: number, data: UserVo) {
    return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/user/${id}`, data))
  }

  function deleteUsers(ids: number[]) {
    return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/user', { data: ids }))
  }

  function resetPassword(id: number) {
    return queries.mutate(() => http.put<ResponseStruct<null>>('/admin/user/password', { id }))
  }

  function getUserRole(id: number) {
    return queries.detail(id, querySignal =>
      http.get<ResponseStruct<Array<{ id: number; code: string; name: string }>>>(`/admin/user/${id}/roles`, {
        signal: querySignal,
      }),
    )
  }

  function setUserRole(id: number, roleCodes: string[]) {
    return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/user/${id}/roles`, { role_codes: roleCodes }))
  }

  return { pageUsers, createUser, saveUser, deleteUsers, resetPassword, getUserRole, setUserRole }
}
