import { useContext } from 'react'
import { RuntimeContext } from '@/provider/runtime/context'
export function useRuntime() {
  const runtime = useContext(RuntimeContext)
  if (!runtime) throw new Error('Framework hooks require AppProviders')
  return runtime
}
