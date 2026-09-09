import { toast as sonnerToast } from 'sonner'

export type ToastVariant = 'info' | 'success' | 'warning' | 'destructive'

type ToastMessage = Parameters<typeof sonnerToast>[0]
type ToastOptions = Parameters<typeof sonnerToast>[1]

export type ToastApi = typeof sonnerToast & {
  /** Compatibility with the project's original toast(message, variant) API. */
  (message: ToastMessage, variant?: ToastVariant): ReturnType<typeof sonnerToast>
}

// Copy the official methods unchanged to preserve their types and return values.
export const toast: ToastApi = Object.assign(
  (message: ToastMessage, options?: ToastOptions | ToastVariant) => {
    if (typeof options === 'string') {
      return sonnerToast[options === 'destructive' ? 'error' : options](message)
    }

    return sonnerToast(message, options)
  },
  sonnerToast,
)
