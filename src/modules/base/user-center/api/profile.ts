import type { ResponseStruct } from '@/types/api'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export interface PermissionUpdateParams {
  nickname?: string
  signed?: string
  avatar?: string
  old_password?: string
  new_password?: string
  new_password_confirmation?: string
  backend_setting?: Record<string, unknown> | unknown[]
}

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('auth', 'profile')

  function updateCurrentUser(data: PermissionUpdateParams) {
    return queries.mutate(() => http.post<ResponseStruct<null>>('/admin/permission/update', data))
  }

  return { updateCurrentUser }
}
