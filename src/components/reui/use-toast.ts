import { useContext } from 'react'
import { ToastContext } from './toast-context'

export { toast } from './toast-api'
export type { ToastApi, ToastVariant } from './toast-api'
export { useSonner } from 'sonner'
export type * from 'sonner'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
