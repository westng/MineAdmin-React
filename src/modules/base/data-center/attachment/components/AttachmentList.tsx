import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useMemo } from 'react'
import { useTable, type ColumnDef } from '@tanstack/react-table'
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid'
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table'
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import { Frame, FramePanel } from '@/components/reui/frame'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import type { AttachmentVo } from '@/modules/base/user-center/api/attachment'
import { formatFileSize, storageLabel } from '../utils/attachment'
import { attachmentName } from '../utils/library'
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

  const columns = useMemo<ColumnDef<DataGridFeatures, AttachmentVo, unknown>[]>(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return [
      ...(canDelete
        ? [
            {
              id: 'selection',
              header: () => <span className="sr-only">{tx('选择文件')}</span>,
              size: 44,
              cell: ({ row }: { row: { original: AttachmentVo } }) => (
                <Checkbox
                  checked={selectedIds.includes(row.original.id)}
                  disabled={disabled}
                  aria-label={tx('选择 {0}', { '0': attachmentName(row.original) })}
                  onCheckedChange={checked => onSelect(row.original.id, checked)}
                />
              ),
            },
          ]
        : []),
      {
        id: 'name',
        header: tx('文件名称'),
        size: 360,
        cell: ({ row }) => (
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onDetail(row.original)}
          >
            <AttachmentPreview compact row={row.original} />
            <span className="min-w-0 truncate font-medium" title={attachmentName(row.original)}>
              {attachmentName(row.original)}
            </span>
          </button>
        ),
      },
      {
        id: 'size',
        header: tx('大小'),
        size: 110,
        cell: ({ row }) => <span className="text-muted-foreground">{formatFileSize(row.original.size_byte)}</span>,
      },
      {
        id: 'storage',
        header: tx('存储位置'),
        size: 120,
        cell: ({ row }) => <span className="text-muted-foreground">{storageLabel(row.original.storage_mode)}</span>,
      },
      {
        id: 'created_at',
        header: tx('上传时间'),
        size: 180,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.created_at || tx('未记录')}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{tx('文件操作')}</span>,
        size: 52,
        cell: ({ row }) => (
          <AttachmentFileMenu
            row={row.original}
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
  const table = useTable<DataGridFeatures, AttachmentVo>({
    features: dataGridFeatures,
    data: rows,
    columns,
    getRowId: row => String(row.id),
    manualPagination: true,
    manualSorting: true,
    enableSorting: false,
    enableRowSelection: false,
  })
  return (
    <Frame dense>
      <FramePanel className="p-0 shadow-none">
        <DataGrid
          table={table}
          recordCount={rows.length}
          tableLayout={{ rowBorder: true, width: 'fixed', columnsResizable: false, columnsMovable: false }}
          tableClassNames={{ base: 'min-w-[780px]', bodyRow: '[&>td]:h-16', edgeCell: 'first:ps-4 last:pe-4' }}
        >
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGrid>
      </FramePanel>
    </Frame>
  )
}
