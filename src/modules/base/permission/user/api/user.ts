import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { PageList, ResponseStruct } from '@/types/api'
import type { UserDepartmentInfo, UserPositionInfo, UserRoleInfo } from '@/modules/base/auth/api/user'

const queries = createResourceQueries('permission', 'users')

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

export function pageUsers(params: Partial<UserVo> = {}, signal?: AbortSignal) {
  return queries.fetch(
    params,
    querySignal => http.get<ResponseStruct<PageList<UserVo>>>('/admin/user/list', { params, signal: querySignal }),
    signal,
  )
}

export function createUser(data: UserVo) {
  return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/user', data))
}

export function saveUser(id: number, data: UserVo) {
  return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/user/${id}`, data))
}

export function deleteUsers(ids: number[]) {
  return queries.mutate(() => http.delete<ResponseStruct<null>>('/admin/user', { data: ids }))
}

export function resetPassword(id: number) {
  return queries.mutate(() => http.put<ResponseStruct<null>>('/admin/user/password', { id }))
}

export function getUserRole(id: number) {
  return queries.detail(id, querySignal =>
    http.get<ResponseStruct<Array<{ id: number; code: string; name: string }>>>(`/admin/user/${id}/roles`, {
      signal: querySignal,
    }),
  )
}

export function setUserRole(id: number, roleCodes: string[]) {
  return queries.mutate(() => http.put<ResponseStruct<null>>(`/admin/user/${id}/roles`, { role_codes: roleCodes }))
}
