import { MaDialog } from '@/components/ma-dialog'
import { Button } from '@/components/ui/button'

interface Props {
  ids: number[]
  pending: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function LogDeleteDialog({ ids, pending, onClose, onConfirm }: Props) {
  return <MaDialog
    open={ids.length > 0}
    onOpenChange={open => { if (!open) onClose() }}
    title="删除日志"
    description={`确认删除所选的 ${ids.length} 条日志？删除后无法恢复。`}
    showFullscreenButton={false}
    showCloseButton={!pending}
    loading={pending}
    footer={<>
      <Button type="button" variant="outline" disabled={pending} onClick={onClose}>取消</Button>
      <Button type="button" variant="destructive" disabled={pending} onClick={() => void onConfirm()}>{pending ? '删除中…' : '确认删除'}</Button>
    </>}
  >
    <p className="break-words text-sm text-muted-foreground">日志 ID：{ids.join('、')}</p>
  </MaDialog>
}
