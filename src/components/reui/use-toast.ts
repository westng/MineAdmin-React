import { useContext } from 'react'
import { ToastContext } from './toast-context'

export type { ToastApi } from './toast-api'
export type * from 'sonner'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
