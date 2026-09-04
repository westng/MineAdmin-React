import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'

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
