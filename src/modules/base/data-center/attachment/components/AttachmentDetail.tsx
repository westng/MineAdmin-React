import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { ChevronDown, Copy, ExternalLink } from 'lucide-react'
import { MaDrawer } from '@/components/ma-drawer'
import { Button } from '@/components/reui/primitives/button'
import type { AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { attachmentUrl, formatFileSize, storageLabel } from '../utils/attachment'
import { attachmentKind, attachmentName } from '../utils/library'
import { AttachmentPreview } from './AttachmentPreview'

const tx = createTextTranslator('base.data-center.attachment.ui')

type DetailField = [string, string | number | null | undefined]

function Metadata({ fields }: { fields: DetailField[] }) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <dl className="space-y-3 text-sm">
      {fields.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {value == null || value === '' ? tx('未记录') : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function AttachmentDetail({
  row,
  onClose,
  onCopy,
}: {
  row: AttachmentVo
  onClose: () => void
  onCopy: (url: string) => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const url = attachmentUrl(row.url)
  const name = attachmentName(row)
  const kind = attachmentKind(row)
  const fields: DetailField[] = [
    [tx('文件大小'), formatFileSize(row.size_byte)],
    [tx('文件类型'), row.mime_type],
    [tx('存储位置'), storageLabel(row.storage_mode)],
    [tx('上传时间'), row.created_at],
    [tx('更新时间'), row.updated_at],
    [tx('上传者 ID'), row.created_by],
  ]
  const technicalFields: DetailField[] = [
    [tx('附件 ID'), row.id],
    [tx('对象名称'), row.object_name],
    [tx('文件后缀'), row.suffix],
    [tx('存储路径'), row.storage_path],
    [tx('文件 Hash'), row.hash],
  ]
  return (
    <MaDrawer
      open
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title={tx('文件详情')}
      description={tx('查看文件信息与访问地址')}
      footer={false}
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border">
          <AttachmentPreview row={row} className="max-h-72" />
        </div>
        <div className="space-y-3">
          <h2 className="break-all text-base font-semibold">{name}</h2>
          <div className="flex flex-wrap gap-2">
            {url && (
              <Button size="sm" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink aria-hidden="true" />
                {tx('打开文件')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!url}
              onClick={() => {
                if (url) onCopy(url)
              }}
            >
              <Copy aria-hidden="true" />
              {tx('复制地址')}
            </Button>
          </div>
          {(!url || kind !== 'image') && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {url ? tx('此类型可通过“打开文件”访问。') : tx('暂无有效访问地址。')}
            </p>
          )}
        </div>
        <div className="space-y-4 border-t pt-5">
          <h3 className="text-sm font-medium">{tx('文件信息')}</h3>
          <Metadata fields={fields} />
        </div>
        {row.remark && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{tx('备注')}</h3>
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{row.remark}</p>
          </div>
        )}
        <details className="group border-t pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {tx('存储详情')}
            <ChevronDown className="size-4 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-4 pt-4">
            <Metadata fields={technicalFields} />
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{tx('文件地址')}</p>
              <p className="break-all rounded-md bg-muted/40 p-3 text-xs leading-relaxed">{row.url || tx('未记录')}</p>
            </div>
          </div>
        </details>
      </div>
    </MaDrawer>
  )
}
