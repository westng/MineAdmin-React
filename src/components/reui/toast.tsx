import type { ComponentProps, ReactNode } from 'react'
import type { Toaster as Sonner } from 'sonner'
import { Toaster as SonnerToaster } from '@/components/reui/primitives/sonner'
import { toast } from './toast-api'
import { ToastContext, type ToastContextValue } from './toast-context'

type ToasterProps = ComponentProps<typeof Sonner>

export type ToastProviderProps = ToasterProps & {
  children: ReactNode
}

const contextValue: ToastContextValue = { toast }

export function Toaster(props: ToasterProps) {
  return <SonnerToaster position="top-right" duration={3500} visibleToasts={4} offset={16} closeButton {...props} />
}

export function ToastProvider({ children, ...props }: ToastProviderProps) {
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster {...props} />
    </ToastContext.Provider>
  )
}
