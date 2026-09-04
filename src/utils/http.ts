import axios, { type AxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/modules/useUserStore'
import { usePluginStore } from '@/provider/plugins'

const http = axios.create({
  baseURL: import.meta.env.VITE_OPEN_PROXY === 'true' ? import.meta.env.VITE_PROXY_PREFIX : import.meta.env.VITE_APP_API_BASEURL,
  timeout: 5000,
  responseType: 'json',
})

http.interceptors.request.use(async config => {
  const { token, language } = useUserStore.getState()
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (token || language) {
    config.headers['Accept-Language'] = language
  }
  await usePluginStore.getState().callHooks('networkRequest', config)
  return config
})

http.interceptors.response.use(async response => {
  await usePluginStore.getState().callHooks('networkResponse', response)
  if (response.data?.code && response.data.code !== 200) {
    const requestConfig = response.config as AxiosRequestConfig & { _retry?: boolean }
    const isRefreshRequest = requestConfig.url?.includes('/admin/passport/refresh')
    if (response.data.code === 401 && !requestConfig._retry && !isRefreshRequest) {
      requestConfig._retry = true
      const refreshed = await useUserStore.getState().refreshToken()
      if (refreshed) return http.request(requestConfig)
    }
    return Promise.reject(response.data)
  }
  return response
}, async (error) => {
  const requestConfig = error?.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
  const status = error?.response?.status
  const isRefreshRequest = requestConfig?.url?.includes('/admin/passport/refresh')
  if (status === 401 && requestConfig && !requestConfig._retry && !isRefreshRequest) {
    requestConfig._retry = true
    const refreshed = await useUserStore.getState().refreshToken()
    if (refreshed) return http.request(requestConfig)
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
})

export default http
