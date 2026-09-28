import { useMemo } from 'react'
import { useToast } from '@/components/reui/use-toast'

export function useMessage() {
  const { toast } = useToast()
  return useMemo(
    () => ({
      success: (message: string) => {
        toast.success(message)
      },
      error: (message: string) => {
        toast.error(message)
      },
      warning: (message: string) => {
        toast.warning(message)
      },
      info: (message: string) => {
        toast.info(message)
      },
    }),
    [toast],
  )
}

export default useMessage
