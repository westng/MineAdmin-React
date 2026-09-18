import http from '@/provider/http'
import type { LoginParams, LoginResult, CurrentUserInfo } from '@/services/auth/types'
import { profileSchema, validateResponse } from '@/services/auth/schemas'
export type * from '@/services/auth/types'

export function loginApi(data: LoginParams) {
  return http.post<{ data: LoginResult }>('/admin/passport/login', data)
}

export function getInfo(signal?: AbortSignal) {
  return http.get<{ data: CurrentUserInfo }>('/admin/passport/getInfo', { signal }).then(response => {
    validateResponse(profileSchema, response.data.data, 'auth.profile')
    return response
  })
}

export function refreshApi(refreshToken: string) {
  return http.post<{ data: LoginResult }>('/admin/passport/refresh', undefined, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
}

export function logoutApi(token?: string) {
  return http.post(
    '/admin/passport/logout',
    undefined,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  )
}
