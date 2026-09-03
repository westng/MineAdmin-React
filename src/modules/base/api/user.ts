import http from '@/utils/http'
import type { PageList, ResponseStruct } from '@/types/api'

export interface LoginParams {
  username: string
  password: string
  code?: string
}

export interface LoginResult {
  access_token: string
  expire_at: number
  refresh_token: string
}

export interface UserDepartmentInfo {
  id: number
  name: string
}

export interface UserPositionInfo {
  id: number
  dept_id: number
  name: string
}

export interface UserRoleInfo {
  id: number
  code: string
  name: string
}

export interface CurrentUserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string | null
  phone?: string | null
  email?: string | null
  signed?: string | null
  status?: 1 | 2
  login_ip?: string | null
  login_time?: string | null
  dashboard?: string
  backend_setting?: Record<string, unknown> | unknown[] | null
  departments?: UserDepartmentInfo[]
  positions?: UserPositionInfo[]
  roles?: UserRoleInfo[]
}

export function loginApi(data: LoginParams) {
  return http.post<{ data: LoginResult }>('/admin/passport/login', data)
}

export function getInfo() {
  return http.get<{ data: CurrentUserInfo }>('/admin/passport/getInfo')
}

export function refreshApi(refreshToken: string) {
  return http.post<{ data: LoginResult }>('/admin/passport/refresh', undefined, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
}

export function logoutApi() {
  return http.post('/admin/passport/logout')
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

export interface PermissionUpdateParams {
  nickname?: string
  signed?: string
  avatar?: string
  old_password?: string
  new_password?: string
  new_password_confirmation?: string
  backend_setting?: Record<string, unknown> | unknown[]
}

export function updateCurrentUser(data: PermissionUpdateParams) {
  return http.post<ResponseStruct<null>>('/admin/permission/update', data)
}

export function updateUserInfo(data: UserVo) {
  return http.put<ResponseStruct<null>>('/admin/user/info', data)
}

export function getUserRole(id: number) {
  return http.get<ResponseStruct<Array<{ id: number; code: string; name: string }>>>(`/admin/user/${id}/roles`)
}

export function setUserRole(id: number, roleCodes: string[]) {
  return http.put<ResponseStruct<null>>(`/admin/user/${id}/roles`, { role_codes: roleCodes })
}
