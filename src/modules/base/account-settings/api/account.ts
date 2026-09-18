import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { ResponseStruct } from '@/types/api'

const queries = createResourceQueries('auth', 'profile')

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
  return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/permission/update', data))
}
