import axios, { AxiosHeaders, type InternalAxiosRequestConfig, type AxiosInstance } from 'axios'

export interface HttpSession {
  token: string | null
  language: string
  sessionVersion: number
  refreshToken: () => Promise<boolean>
}
export interface HttpClientOptions {
  baseURL?: string
  timeout?: number
  session: () => HttpSession
  callHooks?: (hook: string, ...args: unknown[]) => Promise<void>
}
export type HttpClient = Pick<AxiosInstance, 'request' | 'get' | 'post' | 'put' | 'patch' | 'delete'>

export function createHttpClient(options: HttpClientOptions) {
  const http = axios.create({ baseURL: options.baseURL, timeout: options.timeout ?? 5000, responseType: 'json' })
  type SessionRequest = InternalAxiosRequestConfig & {
    _retry?: boolean
    _sessionVersion?: number
    _managedToken?: string
  }

  async function retryAuthenticatedRequest(config: SessionRequest) {
    const state = options.session()
    if (
      config._retry ||
      !config._managedToken ||
      config._sessionVersion !== state.sessionVersion ||
      /\/admin\/passport\/(login|logout|refresh)(?:[/?]|$)/.test(config.url || '')
    )
      return null
    config._retry = true
    // A concurrent request may already have rotated the token.
    if (state.token === config._managedToken && !(await state.refreshToken())) return null
    const latest = options.session()
    if (!latest.token || latest.sessionVersion !== config._sessionVersion) return null
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${latest.token}`)
    config.headers = headers
    config._managedToken = latest.token
    return { response: http.request(config) }
  }

  http.interceptors.request.use(async config => {
    const { token, language, sessionVersion } = options.session()
    const sessionConfig = config as SessionRequest
    if (sessionConfig._sessionVersion !== undefined && sessionConfig._sessionVersion !== sessionVersion) {
      throw new axios.CanceledError('登录会话已变化')
    }
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
      sessionConfig._managedToken = token
      sessionConfig._sessionVersion = sessionVersion
    }
    if (token || language) {
      config.headers['Accept-Language'] = language
    }
    await options.callHooks?.('networkRequest', config)
    if (
      sessionConfig._sessionVersion !== undefined &&
      sessionConfig._sessionVersion !== options.session().sessionVersion
    )
      throw new axios.CanceledError('登录会话已变化')
    return config
  })

  http.interceptors.response.use(
    async response => {
      const config = response.config as SessionRequest
      if (config._sessionVersion !== undefined && config._sessionVersion !== options.session().sessionVersion) {
        return Promise.reject(new axios.CanceledError('登录会话已变化'))
      }
      await options.callHooks?.('networkResponse', response)
      if (config._sessionVersion !== undefined && config._sessionVersion !== options.session().sessionVersion)
        return Promise.reject(new axios.CanceledError('登录会话已变化'))
      if (response.data?.code && response.data.code !== 200) {
        if (response.data.code === 401) {
          const retry = await retryAuthenticatedRequest(response.config)
          if (retry) return retry.response
        }
        return Promise.reject(response.data)
      }
      return response
    },
    async error => {
      if (axios.isCancel(error)) return Promise.reject(error)
      const config = error?.config as SessionRequest | undefined
      if (config?._sessionVersion !== undefined && config._sessionVersion !== options.session().sessionVersion)
        return Promise.reject(new axios.CanceledError('登录会话已变化'))
      if (error?.response?.status === 401 && error.config) {
        const retry = await retryAuthenticatedRequest(error.config)
        if (retry) return retry.response
      }
      const response = error?.response
      const payload = response?.data
      if (payload && typeof payload === 'object') {
        return Promise.reject({
          ...payload,
          code: typeof payload.code === 'number' ? payload.code : response?.status,
        })
      }
      return Promise.reject({
        code: response?.status || 0,
        message: error instanceof Error ? error.message : '网络请求失败',
      })
    },
  )

  return http
}
