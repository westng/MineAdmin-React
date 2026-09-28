import { createContext } from 'react'
import type { AppRuntime } from './types'

export const RuntimeContext = createContext<AppRuntime | null>(null)
