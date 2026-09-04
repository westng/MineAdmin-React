import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/reui/alert'
import { Button } from '@/components/ui/button'
import { ToastContext, type ToastVariant } from '@/components/common/toast-context'

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') return <Check className="size-4 shrink-0" aria-hidden="true" />
  if (variant === 'warning' || variant === 'destructive') return <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
  return <Info className="size-4 shrink-0" aria-hidden="true" />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems(current => current.filter(item => item.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current + 1
    nextId.current = id
    setItems(current => [...current.slice(-3), { id, message, variant }])
    window.setTimeout(() => dismiss(id), 3500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm" aria-live="polite">
          {items.map(item => (
            <Alert key={item.id} variant={item.variant} className="pointer-events-auto flex items-center gap-2 bg-background shadow-lg">
              <ToastIcon variant={item.variant} />
              <AlertDescription className="min-w-0 flex-1">{item.message}</AlertDescription>
              <Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={() => dismiss(item.id)}>
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </Alert>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
