import { useCallback, useState } from 'react'

export function useTable<T, P = Record<string, unknown>>(loader: (params: P) => Promise<T[]>, initialParams: P) {
  const [data, setData] = useState<T[]>([])
  const [params, setParams] = useState<P>(initialParams)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async (nextParams?: P) => {
    const requestParams = nextParams ?? params
    setLoading(true)
    setError(null)
    try {
      setData(await loader(requestParams))
      if (nextParams) setParams(nextParams)
    }
    catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('列表加载失败'))
    }
    finally {
      setLoading(false)
    }
  }, [loader, params])

  return { data, params, setParams, loading, error, refresh }
}

export default useTable
