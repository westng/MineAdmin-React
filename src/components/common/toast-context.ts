import { createContext } from 'react'
import type { ToastApi } from '@/components/common/toast-api'

export type { ToastVariant } from '@/components/common/toast-api'

export type ToastContextValue = {
  toast: ToastApi
}

export const ToastContext = createContext<ToastContextValue | null>(null)
