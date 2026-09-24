import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { MaDialog } from '@/components/ma-dialog'
import { Button } from '@/components/reui/primitives/button'
import type { AttachmentVo } from '../../api'

const tx = createTextTranslator('base.data-center.attachment.ui')

interface Props {
  rows: AttachmentVo[]
  errors: Record<number, string>
  pending: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function AttachmentDeleteDialog({ rows, errors, pending, onClose, onConfirm }: Props) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <MaDialog
      open={rows.length > 0}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title={tx('删除 {0} 条附件记录', { '0': rows.length })}
      description={tx('删除后无法从附件列表恢复。此操作仅删除记录，不会清理存储中的原文件。')}
      showFullscreenButton={false}
      showCloseButton={!pending}
      loading={pending}
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {tx('取消')}
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void onConfirm()}>
            {pending ? tx('删除中…') : Object.keys(errors).length ? tx('重试失败项') : tx('确认删除')}
          </Button>
        </>
      }
    >
      <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
        {rows.map(row => (
          <li key={row.id}>
            <p className="break-all">
              {row.origin_name || row.object_name || tx('附件 #{0}', { '0': row.id })}{' '}
              <span className="text-muted-foreground">#{row.id}</span>
            </p>
            {errors[row.id] && <p className="mt-1 text-destructive">{errors[row.id]}</p>}
          </li>
        ))}
      </ul>
    </MaDialog>
  )
}
