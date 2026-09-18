import { useCallback } from 'react'
import { useRuntime } from '@/hooks/framework/use-runtime'
import { queryKeys } from '@/provider/query/client'
import { pageUsers, type UserVo } from '../api/user'
export function useUserQueries() {
  const runtime = useRuntime()
  const request = useCallback((params: Partial<UserVo>) => pageUsers(params), [])
  const invalidate = useCallback(
    () =>
      runtime.query.invalidateQueries({
        queryKey: queryKeys.resource(runtime.session.getState().sessionVersion, 'permission', 'users'),
      }),
    [runtime],
  )
  return { request, invalidate }
}
