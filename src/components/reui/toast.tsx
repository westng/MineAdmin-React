import { useEffect, useId, useMemo, type ComponentProps, type ReactNode } from 'react'
import type { Toaster as Sonner } from 'sonner'
import { Toaster as SonnerToaster } from '@/components/reui/primitives/sonner'
import { createToast } from './toast-api'
import { ToastContext } from './toast-context'

type ToasterProps = ComponentProps<typeof Sonner>

export type ToastProviderProps = Omit<ToasterProps, 'id'> & {
  children: ReactNode
}

export function Toaster(props: ToasterProps) {
  return <SonnerToaster position="top-right" duration={3500} visibleToasts={4} offset={16} closeButton {...props} />
}

export function ToastProvider({ children, ...props }: ToastProviderProps) {
  const id = useId()
  const contextValue = useMemo(() => ({ toast: createToast(id) }), [id])
  useEffect(() => () => contextValue.toast.dismiss(), [contextValue])
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster {...props} id={id} />
    </ToastContext.Provider>
  )
}
