import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MaConfirmOptions } from '../types'
import type { MaDialogProps } from '../types'

/** 一个声明式 MaDialog 承载页面内所有确认操作。 */
export function useMaConfirm({ onError }: { onError: (error: unknown) => void }) {
  const [request, setRequest] = useState<MaConfirmOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  const currentRequest = useRef<MaConfirmOptions | null>(null)
  const deferredError = useRef<{ request: MaConfirmOptions; error: unknown } | null>(null)
  const reportError = useRef(onError)
  useLayoutEffect(() => {
    reportError.current = onError
  }, [onError])
  useEffect(() => {
    mounted.current = true
    const failure = deferredError.current
    deferredError.current = null
    if (failure && currentRequest.current === failure.request) reportError.current(failure.error)
    return () => {
      mounted.current = false
    }
  }, [])

  function open(nextRequest: MaConfirmOptions) {
    if (!pending.current) {
      currentRequest.current = nextRequest
      deferredError.current = null
      setLoading(false)
      setRequest(nextRequest)
    }
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
      else if (!nextOpen) {
        currentRequest.current = null
        setRequest(null)
      }
    },
    onOk: async () => {
      if (!request || pending.current) return false
      pending.current = true
      setLoading(true)
      try {
        const result = await request.onConfirm()
        if (currentRequest.current === request && result !== false) {
          currentRequest.current = null
          setRequest(null)
        }
      } catch (error) {
        if (currentRequest.current === request) {
          if (mounted.current) reportError.current(error)
          else deferredError.current = { request, error }
        }
      } finally {
        pending.current = false
        setLoading(false)
      }
      return false
    },
  }
  return { open, dialogProps }
}
