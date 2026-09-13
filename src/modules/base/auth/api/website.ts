import http from '@/utils/http'
import type { ResponseStruct } from '@/types/api'
import type { WebsiteLoginConfig } from '../data/website'

export function getWebsiteLoginConfig(signal?: AbortSignal) {
  return http.get<ResponseStruct<WebsiteLoginConfig>>('/system/website/login', { signal })
}
