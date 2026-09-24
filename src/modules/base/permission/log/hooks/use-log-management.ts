import { createTextTranslator } from '@/provider/i18n'
import { useCallback, useRef, useState } from 'react'
import type { MaProTableExpose, MaProTableModel } from '@/components/ma-pro-table'
import { useToast } from '@/components/reui/use-toast'
import { hasAuth, usePermission } from '@/hooks/framework/use-permission'
import type { ResponseStruct } from '@/types/api'
import { logErrorMessage } from '../views/data/log-search'

const tx = createTextTranslator('base.permission.log.ui')

type DeleteLogs = (ids: number[]) => Promise<{ data: ResponseStruct<null> }>

export function useLogManagement<T extends MaProTableModel & { id: number }>(
  deleteLogs: DeleteLogs,
  deletePermission: string,
) {
  const tableRef = useRef<MaProTableExpose<T>>(null)
  const deletingRef = useRef(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteIds, setDeleteIds] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  const { hasAuth: canAccess } = usePermission()
  const canDelete = canAccess(deletePermission)

  const onSelectionChange = useCallback((rows: T[]) => {
    setSelectedIds(rows.map(row => row.id))
  }, [])

  const requestDelete = useCallback(
    (ids: number[]) => {
      if (deletingRef.current || !ids.length) return
      if (!hasAuth(deletePermission)) {
        toast(tx('暂无删除权限，请联系管理员'), 'destructive')
        return
      }
      if (tableRef.current?.getElTableStates().loading) {
        toast(tx('日志正在加载，请稍后操作'), 'warning')
        return
      }
      setDeleteIds([...new Set(ids)])
    },
    [deletePermission, toast],
  )

  const closeDelete = useCallback(() => {
    if (!deletingRef.current) setDeleteIds([])
  }, [])

  const confirmDelete = useCallback(async () => {
    if (deletingRef.current || !deleteIds.length) return
    if (!hasAuth(deletePermission)) {
      toast(tx('暂无删除权限，请联系管理员'), 'destructive')
      return
    }
    deletingRef.current = true
    setDeleting(true)
    try {
      const response = await deleteLogs(deleteIds)
      if (response.data.code !== 200) throw new Error(response.data.message || tx('日志删除失败'))
      setDeleteIds([])
      setSelectedIds([])
      tableRef.current?.getTableRef()?.clearSelection()
      toast(tx('已删除 {0} 条日志', { '0': deleteIds.length }), 'success')
      // Keep the current filters and return to page 1, including after deleting the last page.
      tableRef.current?.search()
    } catch (error) {
      toast(logErrorMessage(error, tx('日志删除失败，请重试')), 'destructive')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }, [deleteIds, deleteLogs, deletePermission, toast])

  return {
    tableRef,
    selectedIds,
    deleteIds,
    deleting,
    canDelete,
    onSelectionChange,
    requestDelete,
    closeDelete,
    confirmDelete,
  }
}
