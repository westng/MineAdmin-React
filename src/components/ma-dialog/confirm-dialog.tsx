import { useRef, useState } from 'react'
import { MaDialog } from './ma-dialog'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onClose: () => void
  onConfirm: () => void | Promise<void>
  confirmText?: string
  onActionError?: (error: unknown) => void
}

/** 项目级确认弹窗，业务模块统一通过 MaDialog 渲染。 */
export function ConfirmDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmText = '确认',
  onActionError,
}: ConfirmDialogProps) {
  const pending = useRef(false)
  const [loading, setLoading] = useState(false)
  return (
    <MaDialog
      open={open}
      title={title}
      description={description}
      okText={confirmText}
      okVariant="destructive"
      showFullscreenButton={false}
      loading={loading}
      onOpenChange={(nextOpen, details) => {
        if (pending.current) {
          details.cancel()
          return
        }
        if (!nextOpen) onClose()
      }}
      onOk={async () => {
        if (pending.current) return false
        pending.current = true
        setLoading(true)
        try {
          // Existing callers close only after success and retain their state on failure.
          await onConfirm()
        } finally {
          pending.current = false
          setLoading(false)
        }
        return false
      }}
      onActionError={onActionError}
    />
  )
}
