import { createContext } from 'react'
import type { ToastApi } from './toast-api'

export type { ToastVariant } from './toast-api'

export type ToastContextValue = {
  toast: ToastApi
}

export const ToastContext = createContext<ToastContextValue | null>(null)
