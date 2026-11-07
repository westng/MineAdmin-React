import type { ResponseStruct } from '@/types/api'

import type { WebsiteLoginConfig } from '../views/data/website'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries } from '@/services/query/resource'

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const queries = createResourceQueries(
    'auth',
    'website',
    runtime.query,
    () => runtime.session.getState().sessionVersion,
  )

  const getWebsiteLoginConfig = queries.list((_params: Record<string, never>, querySignal) =>
    http.get<ResponseStruct<WebsiteLoginConfig>>('/system/website/login', { signal: querySignal }),
  )

  return { getWebsiteLoginConfig }
}
