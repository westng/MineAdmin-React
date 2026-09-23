import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useMemo } from 'react'
import { MaProTable, type MaProTableColumns } from '@/components/ma-pro-table'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import type { AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { formatFileSize, storageLabel } from '../data/attachment'
import { attachmentName } from '../data/library'
import { AttachmentFileMenu } from './AttachmentFileMenu'
import { AttachmentPreview } from './AttachmentPreview'
import type { AttachmentCollectionProps } from './AttachmentGrid'

const tx = createTextTranslator('base.data-center.attachment.ui')

export function AttachmentList({
  rows,
  selectedIds,
  onSelect,
  canDelete,
  disabled,
  onDetail,
  onCopy,
  onDelete,
}: AttachmentCollectionProps) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const columns = useMemo<MaProTableColumns<AttachmentVo>[]>(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
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
        cellRender: ({ row }) => (
          <AttachmentFileMenu
            row={row}
            canDelete={canDelete}
            disabled={disabled}
            onDetail={onDetail}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        ),
      },
    ]
  }, [canDelete, disabled, onCopy, onDelete, onDetail, onSelect, selectedIds, localeRevision])
  return (
    <MaProTable<AttachmentVo>
      data={rows}
      schema={{ tableColumns: columns }}
      options={{
        header: { show: false },
        tableOptions: {
          showPagination: false,
          showOverflowTooltip: false,
          dataGridProps: {
            tableLayout: { rowBorder: true, width: 'fixed', columnsResizable: false, columnsMovable: false },
            tableClassNames: { base: 'min-w-[780px]', bodyRow: '[&>td]:h-16', edgeCell: 'first:ps-4 last:pe-4' },
          },
        },
      }}
    />
  )
}
