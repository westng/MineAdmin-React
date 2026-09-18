import { useQuery } from '@/hooks/framework'
import { useSession } from '@/hooks/framework/use-session'
import { useRuntime } from '@/hooks/framework/use-runtime'
import { queryKeys } from '@/provider/query/client'
export function HelloModule() {
  const { http } = useRuntime()
  const version = useSession(state => state.sessionVersion)
  const result = useQuery({
    queryKey: queryKeys.resource(version, 'example', 'hello'),
    queryFn: async ({ signal }) =>
      (await http.get<{ data: { message: string } }>('/example/hello', { signal })).data.data,
  })
  if (result.isPending) return <p role="status">加载中…</p>
  if (result.isError) return <button onClick={() => void result.refetch()}>重试</button>
  return <p>{result.data.message}</p>
}
