import { createContext } from 'react'
import type { MaRemoteSelectRequest } from '../types'

export const MaRemoteSelectRequestContext = createContext<MaRemoteSelectRequest | null>(null)
