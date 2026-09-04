import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'
import type { UserDepartmentInfo, UserPositionInfo, UserRoleInfo } from '@/modules/base/auth/api/user'

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
  departments?: UserDepartmentInfo[]
  positions?: UserPositionInfo[]
  roles?: UserRoleInfo[]
  [key: string]: unknown
}

export function pageUsers(params: Partial<UserVo> = {}) {
  return http.get<ResponseStruct<PageList<UserVo>>>('/admin/user/list', { params })
}

export function createUser(data: UserVo) {
  return http.post<ResponseStruct<null>>('/admin/user', data)
}

export function saveUser(id: number, data: UserVo) {
  return http.put<ResponseStruct<null>>(`/admin/user/${id}`, data)
}

export function deleteUsers(ids: number[]) {
  return http.delete<ResponseStruct<null>>('/admin/user', { data: ids })
}

export function resetPassword(id: number) {
  return http.put<ResponseStruct<null>>('/admin/user/password', { id })
}

export function getUserRole(id: number) {
  return http.get<ResponseStruct<Array<{ id: number; code: string; name: string }>>>(`/admin/user/${id}/roles`)
}

export function setUserRole(id: number, roleCodes: string[]) {
  return http.put<ResponseStruct<null>>(`/admin/user/${id}/roles`, { role_codes: roleCodes })
}
