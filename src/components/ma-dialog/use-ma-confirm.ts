import { useEffect, useRef, useState } from 'react'
import type { MaDialogProps } from './types'

export interface MaConfirmOptions {
  title: MaDialogProps['title']
  description: MaDialogProps['description']
  okText?: MaDialogProps['okText']
  okVariant?: MaDialogProps['okVariant']
  onConfirm: () => void | boolean | Promise<void | boolean>
}

/** 一个声明式 MaDialog 承载页面内所有确认操作。 */
export function useMaConfirm({ onError }: { onError: (error: unknown) => void }) {
  const [request, setRequest] = useState<MaConfirmOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  function open(nextRequest: MaConfirmOptions) {
    if (!pending.current) setRequest(nextRequest)
  }

  const dialogProps: MaDialogProps = {
    open: request !== null,
    loading,
    title: request?.title,
    description: request?.description,
    okText: request?.okText,
    okVariant: request?.okVariant,
    showFullscreenButton: false,
    onOpenChange: (nextOpen, details) => {
      if (pending.current) details.cancel()
      else if (!nextOpen) setRequest(null)
    },
    onOk: async () => {
      if (!request || pending.current) return false
      pending.current = true
      setLoading(true)
      try {
        const result = await request.onConfirm()
        if (mounted.current && result !== false) setRequest(null)
      } catch (error) {
        if (mounted.current) onError(error)
      } finally {
        pending.current = false
        if (mounted.current) setLoading(false)
      }
      return false
    },
  }
  return { open, dialogProps }
}
