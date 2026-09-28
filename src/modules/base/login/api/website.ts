import type { ResponseStruct } from '@/types/api'

import type { WebsiteLoginConfig } from '../views/data/website'

import type { AppRuntime } from '@/provider/runtime/types'
import { createResourceQueries as createQueries } from '@/services/query/resource'

export function createApi(runtime: Pick<AppRuntime, 'http' | 'query' | 'session'>) {
  const http = runtime.http
  const createResourceQueries = (module: string, resource: string) =>
    createQueries(module, resource, runtime.query, () => runtime.session.getState().sessionVersion)

  const queries = createResourceQueries('auth', 'website')

  const getWebsiteLoginConfig = queries.list((signal: AbortSignal, querySignal) =>
    http.get<ResponseStruct<WebsiteLoginConfig>>('/system/website/login', { signal: querySignal }),
  )

  return { getWebsiteLoginConfig }
}
