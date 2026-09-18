import { createResourceQueries } from '@/provider/query/resource'
import http from '@/provider/http'
import type { ResponseStruct } from '@/types/api'
import type { UserVo } from '@/modules/base/permission/user/api/user'

const queries = createResourceQueries('auth', 'profile')

export function updateUserInfo(data: UserVo) {
  return queries.mutate(() => http.put<ResponseStruct<null>>('/admin/user/info', data))
}
