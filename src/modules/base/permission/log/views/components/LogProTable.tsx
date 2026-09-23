import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Trash2 } from 'lucide-react'
import {
  MaProTable,
  type MaProTableApi,
  type MaProTableColumns,
  type MaProTableExpose,
  type MaProTableModel,
  type MaProTableOptions,
} from '@/components/ma-pro-table'
import type { MaSearchItem } from '@/components/ma-search'
import { useToast } from '@/components/reui/use-toast'
import { Button } from '@/components/reui/primitives/button'
import { hasAuth } from '@/hooks/framework/use-permission'
import { logErrorMessage } from '../data/log-search'
import type { LogTableColumnOptions } from '../data/getTableColumns'

const tx = createTextTranslator('base.permission.log.ui')

interface Props<T extends MaProTableModel & { id: number }> {
  tableRef: RefObject<MaProTableExpose<T> | null>
  title: string
  description: string
  listPermission: string
  api: MaProTableApi
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
  api,
  searchItems,
  getTableColumns,
  canDelete,
  deleting,
  selectedIds,
  onSelectionChange,
  onDetail,
  onDelete,
}: Props<T>) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const { toast } = useToast()
  const [requestPending, setRequestPending] = useState(true)
  const requestSequence = useRef(0)
  const busy = deleting || requestPending
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getTableColumns({ canDelete, busy, onDetail, onDelete })
  }, [busy, canDelete, getTableColumns, onDelete, onDetail, localeRevision])

  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns, tableRef])

  const request = useCallback(
    async (params: Record<string, unknown>) => {
      const sequence = ++requestSequence.current
      setRequestPending(true)
      tableRef.current?.getTableRef()?.clearSelection()
      try {
        if (!hasAuth(listPermission)) throw new Error(tx('暂无查看权限，请联系管理员'))
        return await api(params)
      } catch (error) {
        const message = logErrorMessage(error, tx('{0}加载失败，请重试', { '0': title }))
        if (sequence === requestSequence.current) toast(message, 'destructive')
        throw new Error(message, { cause: error })
      } finally {
        if (sequence === requestSequence.current) {
          tableRef.current?.getTableRef()?.clearSelection()
          setRequestPending(false)
        }
      }
    },
    [api, listPermission, tableRef, title, toast],
  )

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
        api: request,
        requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
        response: { dataKey: 'list', totalKey: 'total' },
      },
      tableOptions: {
        rowKey: 'id',
        className: 'min-w-[1200px]',
        tableLayout: 'fixed',
        emptyText: tx('暂无符合条件的日志'),
        pagination: { pageSizes: [10, 20, 50, 100] },
      },
    }
  }, [description, listPermission, request, title, toast, localeRevision])

  return (
    <MaProTable<T>
      ref={tableRef}
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
