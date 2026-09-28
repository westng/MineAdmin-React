import { useQueryTable, type TableQueryOptions } from '@/hooks/query/use-query-table'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useEffect, useMemo, type RefObject } from 'react'
import { Trash2 } from 'lucide-react'
import {
  MaProTable,
  type MaProTableColumns,
  type MaProTableExpose,
  type MaProTableModel,
  type MaProTableOptions,
} from '@/components/ma-pro-table'
import type { MaSearchItem } from '@/components/ma-search'
import { useToast } from '@/components/reui/use-toast'
import { Button } from '@/components/reui/primitives/button'
import type { LogTableColumnOptions } from '../data/getTableColumns'

interface Props<T extends MaProTableModel & { id: number }> {
  tableRef: RefObject<MaProTableExpose<T> | null>
  title: string
  description: string
  listPermission: string
  queryOptions: TableQueryOptions
  searchItems: MaSearchItem<T>[]
  getTableColumns: (options: LogTableColumnOptions<T>) => MaProTableColumns<T>[]
  canDelete: boolean
  deleting: boolean
  selectedIds: number[]
  onSelectionChange: (rows: T[]) => void
  onDetail: (row: T) => void
  onDelete: (ids: number[]) => void
}

export function LogProTable<T extends MaProTableModel & { id: number }>({
  tableRef,
  title,
  description,
  listPermission,
  queryOptions,
  searchItems,
  getTableColumns,
  canDelete,
  deleting,
  selectedIds,
  onSelectionChange,
  onDetail,
  onDelete,
}: Props<T>) {
  const tx = useTextTranslator('base.permission.log.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const { toast } = useToast()
  const query = useQueryTable<T>(queryOptions)
  const busy = deleting || query.loading
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getTableColumns({ canDelete, busy, onDetail, onDelete })
  }, [busy, canDelete, getTableColumns, onDelete, onDetail, localeRevision])

  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns, tableRef])

  const options = useMemo<MaProTableOptions<T>>(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return {
      id: listPermission,
      header: { mainTitle: title, subTitle: description },
      toolbar: true,
      searchOptions: {
        defaultValue: {},
        labelPlacement: 'outside',
        foldButtonShow: false,
        cols: { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
      },
      onSearchReset: () => {
        toast(tx('筛选条件已重置'))
      },
      requestOptions: {
        api: query.request,
        requestKey: query.sessionVersion,
        requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
        response: { dataKey: 'list', totalKey: 'total' },
      },
      tableOptions: {
        rowKey: 'id',
        className: 'min-w-[1200px]',
        tableLayout: 'fixed',
        emptyText: tx('暂无符合条件的日志'),
        pagination: { total: query.total, pageSizes: [10, 20, 50, 100] },
      },
    }
  }, [localeRevision, listPermission, title, description, query.request, query.sessionVersion, query.total, tx, toast])

  return (
    <MaProTable<T>
      ref={tableRef}
      data={query.data}
      loading={query.loading}
      error={query.error}
      schema={{ searchItems, tableColumns: columns }}
      options={options}
      toolbarLeft={
        canDelete && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy || !selectedIds.length}
              onClick={() => onDelete(selectedIds)}
            >
              <Trash2 aria-hidden="true" />
              {tx('批量删除')}
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {tx('已选择')}
              {selectedIds.length} {tx('条')}
            </span>
          </div>
        )
      }
      onSelectionChange={onSelectionChange}
    />
  )
}
