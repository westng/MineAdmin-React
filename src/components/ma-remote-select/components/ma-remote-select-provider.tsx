import { MaRemoteSelectRequestContext } from '../context/request-context'
import type { MaRemoteSelectProviderProps } from '../types'

export function MaRemoteSelectProvider({ request, children }: MaRemoteSelectProviderProps) {
  return <MaRemoteSelectRequestContext.Provider value={request}>{children}</MaRemoteSelectRequestContext.Provider>
}
