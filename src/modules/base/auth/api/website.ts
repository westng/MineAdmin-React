import http from '@/provider/http'
import type { ResponseStruct } from '@/types/api'
import type { WebsiteLoginConfig } from '../views/data/website'
import { createResourceQueries } from '@/provider/query/resource'

const queries = createResourceQueries('auth', 'website')

export function getWebsiteLoginConfig(signal?: AbortSignal) {
  return queries.fetch(
    {},
    querySignal => http.get<ResponseStruct<WebsiteLoginConfig>>('/system/website/login', { signal: querySignal }),
    signal,
  )
}
