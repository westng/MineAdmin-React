import { createContext, useContext } from 'react'

import type { MaRemoteSelectRequest } from './types'

export const MaRemoteSelectRequestContext = createContext<MaRemoteSelectRequest | null>(null)

export function useMaRemoteSelectRequest() {
  return useContext(MaRemoteSelectRequestContext)
}
