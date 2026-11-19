import { Copy, ExternalLink, Info, Trash2 } from 'lucide-react'
import type { MaProTableColumns } from '@/components/ma-pro-table'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import type { TextTranslator } from '@/services/i18n/translator'
import type { AttachmentVo } from '../../api/attachment'
import { AttachmentPreview } from '../components/AttachmentPreview'
import type { AttachmentCollectionProps } from '../components/AttachmentGrid'
export function getTableColumns({
  tx,
  attachmentName,
  attachmentUrl,
  formatFileSize,
  storageLabel,
  selectedIds,
  canDelete,
  disabled,
  onSelect,
  onDetail,
  onCopy,
  onDelete,
  onOpen,
}: Omit<AttachmentCollectionProps, 'rows'> & {
  tx: TextTranslator
  attachmentName: (row: AttachmentVo) => string
  attachmentUrl: (value: unknown) => string | null
  formatFileSize: (size: number | undefined) => string
  storageLabel: (value: string | number | null | undefined) => string
  onOpen: (row: AttachmentVo) => void
}): MaProTableColumns<AttachmentVo>[] {
  return [
    ...(canDelete
      ? [
          {
            prop: 'id' as const,
            label: tx('选择文件'),
            width: 44,
            cellRender: ({ row }: { row: AttachmentVo }) => (
              <Checkbox
                checked={selectedIds.includes(row.id)}
                disabled={disabled}
                aria-label={tx('选择 {0}', { '0': attachmentName(row) })}
                onCheckedChange={checked => onSelect(row.id, checked === true)}
              />
            ),
          },
        ]
      : []),
    {
      prop: 'origin_name',
      label: tx('文件名称'),
      width: 360,
      cellRender: ({ row }) => (
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onDetail(row)}
        >
          <AttachmentPreview compact row={row} />
          <span className="min-w-0 truncate font-medium" title={attachmentName(row)}>
            {attachmentName(row)}
          </span>
        </button>
      ),
    },
    {
      prop: 'size_byte',
      label: tx('大小'),
      width: 110,
      cellRender: ({ row }) => <span className="text-muted-foreground">{formatFileSize(row.size_byte)}</span>,
    },
    {
      prop: 'storage_mode',
      label: tx('存储位置'),
      width: 120,
      cellRender: ({ row }) => <span className="text-muted-foreground">{storageLabel(row.storage_mode)}</span>,
    },
    {
      prop: 'created_at',
      label: tx('上传时间'),
      width: 180,
      cellRender: ({ row }) => <span className="text-muted-foreground">{row.created_at || tx('未记录')}</span>,
    },
    {
      type: 'operation',
      label: tx('文件操作'),
      width: 52,
      operationConfigure: {
        type: 'dropdown',
        actions: [
          {
            name: 'detail',
            text: tx('文件详情'),
            icon: <Info aria-hidden="true" />,
            disabled: () => disabled,
            onClick: ({ row }) => onDetail(row),
          },
          {
            name: 'copy',
            text: tx('复制地址'),
            icon: <Copy aria-hidden="true" />,
            disabled: ({ row }) => disabled || !attachmentUrl(row.url),
            onClick: ({ row }) => {
              const url = attachmentUrl(row.url)
              if (url) onCopy(url)
            },
          },
          {
            name: 'open',
            text: ({ row }) => tx(attachmentUrl(row.url) ? '打开文件' : '地址不可用'),
            icon: <ExternalLink aria-hidden="true" />,
            disabled: ({ row }) => disabled || !attachmentUrl(row.url),
            onClick: ({ row }) => onOpen(row),
          },
          {
            name: 'delete',
            text: tx('删除记录'),
            icon: <Trash2 aria-hidden="true" />,
            variant: 'destructive',
            show: () => canDelete,
            disabled: () => disabled,
            onClick: ({ row }) => onDelete([row]),
          },
        ],
      },
    },
  ]
}
