import type { ResponseStruct } from '@/types/api'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export type UserLoginLogVo = {
  id: number
  username: string
  ip: string | null
  os: string | null
  browser: string | null
  status: number
  message: string | null
  login_time: string
  remark: string | null
}

export type UserOperationLogVo = {
  id: number
  username: string
  method: string
  router: string
  service_name: string
  ip: string | null
  created_at: string | null
  updated_at: string | null
  remark: string | null
}

export type LogPage<T> = { list: T[]; total: number }

type LogPageParams = { page?: number; page_size?: number }

export type LoginLogParams = LogPageParams & {
  username?: string
  ip?: string
  os?: string
  browser?: string
  status?: 1 | 2
  login_time?: [string, string]
}

export type OperationLogParams = LogPageParams & {
  username?: string
  ip?: string
  method?: string
  router?: string
  service_name?: string
  created_at?: [string, string]
}

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const loginQueries = createResourceQueries('permission', 'login-logs')

  const operationQueries = createResourceQueries('permission', 'operation-logs')

  const userLoginLogApi = {
    page: loginQueries.list((params: LoginLogParams, signal) =>
      http.get<ResponseStruct<LogPage<UserLoginLogVo>>>('/admin/user-login-log/list', { params, signal }),
    ),
    delete: (ids: number[]) =>
      loginQueries.mutate(() => http.delete<ResponseStruct<null>>('/admin/user-login-log', { data: { ids } })),
  }

  const userOperationLogApi = {
    page: operationQueries.list((params: OperationLogParams, signal) =>
      http.get<ResponseStruct<LogPage<UserOperationLogVo>>>('/admin/user-operation-log/list', { params, signal }),
    ),
    delete: (ids: number[]) =>
      operationQueries.mutate(() => http.delete<ResponseStruct<null>>('/admin/user-operation-log', { data: { ids } })),
  }

  return { userLoginLogApi, userOperationLogApi }
}
