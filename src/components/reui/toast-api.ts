import { toast as sonnerToast } from 'sonner'

type ToastMessage = Parameters<typeof sonnerToast>[0]
type ToastOptions = Omit<NonNullable<Parameters<typeof sonnerToast>[1]>, 'toasterId'>
type ToastMethod = (message: ToastMessage, options?: ToastOptions) => string | number

/** A provider owns its notifications, including explicit IDs and dismissal. */
export function createToast(scope: string) {
  const owned = new Set<string | number>()
  let sequence = 0
  const scoped =
    (emit: (message: ToastMessage, options?: Parameters<typeof sonnerToast>[1]) => string | number): ToastMethod =>
    (message, options) => {
      const id = `${scope}:${options?.id ?? ++sequence}`
      owned.add(id)
      return emit(message, { ...options, id, toasterId: scope })
    }
  return Object.assign(scoped(sonnerToast), {
    success: scoped(sonnerToast.success),
    error: scoped(sonnerToast.error),
    info: scoped(sonnerToast.info),
    warning: scoped(sonnerToast.warning),
    loading: scoped(sonnerToast.loading),
    dismiss(id?: string | number) {
      if (id !== undefined) {
        const key = owned.has(id) ? id : `${scope}:${id}`
        if (owned.delete(key)) sonnerToast.dismiss(key)
      } else {
        owned.forEach(key => sonnerToast.dismiss(key))
        owned.clear()
      }
    },
  })
}

export type ToastApi = ReturnType<typeof createToast>
