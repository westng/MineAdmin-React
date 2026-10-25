import type { HttpClient } from '@/services/http/client'
import type { LoginParams, LoginResult, LoginCaptcha, CurrentUserInfo } from '@/services/auth/types'
import { captchaSchema, profileSchema, validateResponse } from '@/services/auth/schemas'
export type * from '@/services/auth/types'

export function createAuthApi(http: HttpClient) {
  async function captchaApi(signal?: AbortSignal): Promise<LoginCaptcha> {
    const response = await http.post<{ data: LoginCaptcha }>('/admin/passport/captcha', undefined, { signal })
    return validateResponse(captchaSchema, response.data.data, 'auth.captcha')
  }
  function loginApi(data: LoginParams, signal?: AbortSignal) {
    return http.post<{ data: LoginResult }>('/admin/passport/login', data, { signal })
  }

  function getInfo(signal?: AbortSignal) {
    return http.get<{ data: CurrentUserInfo }>('/admin/passport/getInfo', { signal }).then(response => {
      validateResponse(profileSchema, response.data.data, 'auth.profile')
      return response
    })
  }

  function refreshApi(refreshToken: string, signal?: AbortSignal) {
    return http.post<{ data: LoginResult }>('/admin/passport/refresh', undefined, {
      headers: { Authorization: `Bearer ${refreshToken}` },
      signal,
    })
  }

  function logoutApi(token?: string) {
    return http.post(
      '/admin/passport/logout',
      undefined,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
  }

  return { captchaApi, loginApi, getInfo, refreshApi, logoutApi }
}
