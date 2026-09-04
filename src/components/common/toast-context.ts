import { createContext } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'destructive'

export type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
