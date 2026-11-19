import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useCallback, useMemo } from 'react'
import { MaProTable } from '@/components/ma-pro-table'
import type { AttachmentVo } from '../../api/attachment'
import { createViewData as createAttachmentViewData } from '../data/attachment'
import { createViewData as createLibraryViewData } from '../data/library'
import type { AttachmentCollectionProps } from './AttachmentGrid'
import { getTableColumns } from '../data/getTableColumns'

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
  const { attachmentUrl, formatFileSize, storageLabel } = useRuntimeFactory(createAttachmentViewData)
  const { attachmentName } = useRuntimeFactory(createLibraryViewData)

  const tx = useTextTranslator('base.data-center.attachment.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const onOpen = useCallback(
    (row: AttachmentVo) => {
      const url = attachmentUrl(row.url)
      if (url && !disabled) window.open(url, '_blank', 'noopener,noreferrer')
    },
    [attachmentUrl, disabled],
  )
  const columns = useMemo(() => {
    void localeRevision
    return getTableColumns({
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
    })
  }, [
    localeRevision,
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
  ])
  return (
    <MaProTable<AttachmentVo>
      data={rows}
      schema={{ tableColumns: columns }}
      options={{
        header: { show: false },
        tableOptions: {
          rowKey: 'id',
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
