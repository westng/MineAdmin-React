import type { PropsWithChildren } from 'react'

import { MaRemoteSelectRequestContext } from './request-context'
import type { MaRemoteSelectRequest } from './types'

export function MaRemoteSelectProvider({ request, children }: PropsWithChildren<{ request: MaRemoteSelectRequest }>) {
  return <MaRemoteSelectRequestContext.Provider value={request}>{children}</MaRemoteSelectRequestContext.Provider>
}
