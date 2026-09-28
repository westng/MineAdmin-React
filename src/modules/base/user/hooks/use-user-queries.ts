import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createUserApi } from '../api/user'
import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useSession } from '@/hooks/auth/use-session'
import { extractList, extractTotal } from '@/utils/api-data'
import type { UserVo } from '../api/user'
const emptyRows: UserVo[] = []

/** Query owns server state; MaProTable only owns search, pagination and selection. */
export function useUserQueries() {
  const { pageUsers } = useRuntimeFactory(createUserApi)
  const runtime = useRuntime()
  const sessionVersion = useSession(state => state.sessionVersion)
  const [parameters, setParameters] = useState<Partial<UserVo> | null>(null)
  const query = useQuery({ ...pageUsers.queryOptions(parameters ?? {}), enabled: parameters !== null }, runtime.query)
  const request = useCallback(
    (params: Partial<UserVo>) => {
      setParameters(params)
      return runtime.query.fetchQuery({ ...pageUsers.queryOptions(params), staleTime: 0 })
    },
    [runtime, pageUsers],
  )
  const data = useMemo(() => (query.data ? extractList<UserVo>(query.data.data.data) : emptyRows), [query.data])
  return {
    request,
    sessionVersion,
    data,
    total: extractTotal(query.data?.data.data, data.length),
    loading: query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : '用户数据加载失败') : '',
  }
}
