import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'

export interface UserLoginLogVo {
  id: number
  username: string
  ip: string
  os: string
  browser: string
  status: number
  message: string
  login_time: string
  remark: string
}

export interface UserOperationLogVo {
  id: number
  username: string
  method: string
  router: string
  service_name: string
  ip: string
  created_at: string
  updated_at: string
  remark: string
}

export const userLoginLogApi = {
  page: (params: Partial<UserLoginLogVo> = {}) => http.get<ResponseStruct<UserLoginLogVo[]>>('/admin/user-login-log/list', { params }),
  delete: (ids: number[]) => http.delete<ResponseStruct<null>>('/admin/user-login-log', { data: { ids } }),
}

export const userOperationLogApi = {
  page: (params: Partial<UserOperationLogVo> = {}) => http.get<ResponseStruct<UserOperationLogVo[]>>('/admin/user-operation-log/list', { params }),
  delete: (ids: number[]) => http.delete<ResponseStruct<null>>('/admin/user-operation-log', { data: { ids } }),
}
