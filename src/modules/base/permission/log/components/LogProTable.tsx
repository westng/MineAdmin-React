import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableApi, type MaProTableColumns, type MaProTableExpose, type MaProTableModel, type MaProTableSchema } from '@/components/ma-pro-table'
import { useToast } from '@/components/common/use-toast'
import { Button } from '@/components/ui/button'
import { hasAuth } from '@/hooks/usePermission'
import { logErrorMessage } from '../utils/log-search'

interface Props<T extends MaProTableModel & { id: number }> {
  tableRef: RefObject<MaProTableExpose<T> | null>
  title: string
  description: string
  listPermission: string
  api: MaProTableApi
  schema: MaProTableSchema<T>
  canDelete: boolean
  deleting: boolean
  selectedIds: number[]
  onSelectionChange: (rows: T[]) => void
  onDetail: (row: T) => void
  onDelete: (ids: number[]) => void
}

export function LogProTable<T extends MaProTableModel & { id: number }>({ tableRef, title, description, listPermission, api, schema, canDelete, deleting, selectedIds, onSelectionChange, onDetail, onDelete }: Props<T>) {
  const { toast } = useToast()
  const [requestPending, setRequestPending] = useState(true)
  const requestSequence = useRef(0)
  const busy = deleting || requestPending
  const columns = useMemo<MaProTableColumns<T>[]>(() => [
    ...(canDelete ? [{ type: 'selection' as const, width: 44 }] : []),
    ...(schema.tableColumns ?? []),
    { prop: 'actions', label: '操作', align: 'right', width: canDelete ? 160 : 90, cellRender: ({ row }) => <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onDetail(row)}><Eye aria-hidden="true" />详情</Button>
      {canDelete && <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={() => onDelete([row.id])}><Trash2 aria-hidden="true" />删除</Button>}
    </div> },
  ], [busy, canDelete, onDelete, onDetail, schema.tableColumns])

  useEffect(() => { tableRef.current?.setTableColumns(columns) }, [columns, tableRef])

  const request = useCallback(async (params: Record<string, unknown>) => {
    const sequence = ++requestSequence.current
    setRequestPending(true)
    tableRef.current?.getTableRef()?.clearSelection()
    try {
      if (!hasAuth(listPermission)) throw new Error('暂无查看权限，请联系管理员')
      return await api(params)
    }
    catch (error) {
      const message = logErrorMessage(error, `${title}加载失败，请重试`)
      if (sequence === requestSequence.current) toast(message, 'destructive')
      throw new Error(message, { cause: error })
    }
    finally {
      if (sequence === requestSequence.current) {
        tableRef.current?.getTableRef()?.clearSelection()
        setRequestPending(false)
      }
    }
  }, [api, listPermission, tableRef, title, toast])

  return <MaProTable<T>
    ref={tableRef}
    schema={{ searchItems: schema.searchItems, tableColumns: columns }}
    options={{
      id: listPermission,
      header: { mainTitle: title, subTitle: description },
      toolbar: true,
      searchOptions: { defaultValue: {}, labelPlacement: 'outside', foldButtonShow: false, cols: { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 } },
      onSearchReset: () => { toast('筛选条件已重置') },
      requestOptions: {
        api: request,
        requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
        response: { dataKey: 'list', totalKey: 'total' },
      },
      tableOptions: { rowKey: 'id', className: 'min-w-[1200px]', tableLayout: 'fixed', emptyText: '暂无符合条件的日志', pagination: { pageSizes: [10, 20, 50, 100] } },
    }}
    toolbarLeft={canDelete && <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="destructive" size="sm" disabled={busy || !selectedIds.length} onClick={() => onDelete(selectedIds)}><Trash2 aria-hidden="true" />批量删除</Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">已选择 {selectedIds.length} 条</span>
    </div>}
    onSelectionChange={onSelectionChange}
  />
}
