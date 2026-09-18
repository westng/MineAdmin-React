import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { MaDialog } from '@/components/ma-dialog'
import { Button } from '@/components/reui/primitives/button'

const tx = createTextTranslator('base.permission.log.ui')

interface Props {
  ids: number[]
  pending: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function LogDeleteDialog({ ids, pending, onClose, onConfirm }: Props) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <MaDialog
      open={ids.length > 0}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title={tx('删除日志')}
      description={tx('确认删除所选的 {0} 条日志？删除后无法恢复。', { '0': ids.length })}
      showFullscreenButton={false}
      showCloseButton={!pending}
      loading={pending}
      footer={
        <>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {tx('取消')}
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void onConfirm()}>
            {pending ? tx('删除中…') : tx('确认删除')}
          </Button>
        </>
      }
    >
      <p className="break-words text-sm text-muted-foreground">
        {tx('日志 ID：')}
        {ids.join('、')}
      </p>
    </MaDialog>
  )
}
