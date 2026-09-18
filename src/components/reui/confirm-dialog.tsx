import { Button } from '@/components/reui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onClose: () => void
  onConfirm: () => void | Promise<void>
  confirmText?: string
}

export function ConfirmDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmText = '确认',
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {'取消'}
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
