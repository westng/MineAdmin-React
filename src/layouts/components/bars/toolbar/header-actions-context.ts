import { createContext, type ReactNode } from 'react'

export const HeaderActionsContext = createContext<ReactNode>(null)
export const HeaderActionsSetterContext = createContext<((actions: ReactNode) => void) | null>(null)
