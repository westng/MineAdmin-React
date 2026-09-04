import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'
import type { UserVo } from '@/modules/base/permission/user/api/user'

export function updateUserInfo(data: UserVo) {
  return http.put<ResponseStruct<null>>('/admin/user/info', data)
}
