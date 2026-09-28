import { MaDialog, useMaConfirm } from '@/components/ma-dialog'
import type { MaProTableExpose } from '@/components/ma-pro-table'
import { useToast } from '@/components/reui/use-toast'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useCallback, useRef, useState } from 'react'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi } from '../api/log'
import { MaDrawer } from '@/components/ma-drawer'
import { usePermission } from '@/hooks/auth/use-permission'
import { type UserOperationLogVo } from '../api/log'
import { LogProTable } from './components/LogProTable'
import { OperationLogDetails } from './components/LogRecordFields'
import { createViewData as createLogSearchViewData } from './data/log-search'
import { createViewData as createSearchItemsViewData } from './data/getSearchItems'
import { createViewData as createTableColumnsViewData } from './data/getTableColumns'

export default function UserOperationLogPage() {
  const { toOperationLogParams } = useRuntimeFactory(createLogSearchViewData)
  const { getOperationSearchItems } = useRuntimeFactory(createSearchItemsViewData)
  const { getOperationTableColumns } = useRuntimeFactory(createTableColumnsViewData)

  const tx = useTextTranslator('base.permission.log.ui')

  const { userOperationLogApi } = useRuntimeFactory(createApi)
  const requestLogs = useCallback(
    (params: Record<string, unknown>) => userOperationLogApi.page.queryOptions(toOperationLogParams(params)),
    [toOperationLogParams, userOperationLogApi.page],
  )
  const localeRevision = useLocaleRevision()
  void localeRevision
  const searchItems = getOperationSearchItems()

  const { hasAuth } = usePermission()
  const tableRef = useRef<MaProTableExpose<UserOperationLogVo>>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()
  const confirm = useMaConfirm({
    onError: error => toast.error(error instanceof Error ? error.message : tx('日志删除失败，请重试')),
  })
  function requestDelete(ids: number[]) {
    if (!ids.length || !hasAuth('log:userOperation:delete')) return
    if (tableRef.current?.getElTableStates().loading) {
      toast.warning(tx('日志正在加载，请稍后操作'))
      return
    }
    const selected = [...new Set(ids)]
    confirm.open({
      title: tx('删除日志'),
      description: tx('确认删除所选的 {0} 条日志？删除后无法恢复。', { '0': selected.length }),
      okText: tx('确认删除'),
      okVariant: 'destructive',
      onConfirm: async () => {
        if (!hasAuth('log:userOperation:delete')) return false
        const response = await userOperationLogApi.delete(selected)
        if (response.data.code !== 200) throw new Error(response.data.message || tx('日志删除失败'))
        setSelectedIds([])
        tableRef.current?.getTableRef()?.clearSelection()
        toast.success(tx('已删除 {0} 条日志', { '0': selected.length }))
        await tableRef.current?.search()
      },
    })
  }
  const [detail, setDetail] = useState<UserOperationLogVo | null>(null)

  if (!hasAuth('log:userOperation:list'))
    return (
      <div className="text-sm text-muted-foreground" role="status">
        {tx('暂无操作日志查看权限，请联系管理员。')}
      </div>
    )

  return (
    <section className="min-w-0 space-y-4" aria-label={tx('操作日志')}>
      <LogProTable
        tableRef={tableRef}
        title={tx('操作日志')}
        description={tx('查看用户请求、业务操作和操作时间。文本筛选为精确匹配，时间筛选需填写完整起止时间。')}
        listPermission="log:userOperation:list"
        queryOptions={requestLogs}
        searchItems={searchItems}
        getTableColumns={getOperationTableColumns}
        canDelete={hasAuth('log:userOperation:delete')}
        deleting={Boolean(confirm.dialogProps.loading)}
        selectedIds={selectedIds}
        onSelectionChange={rows => setSelectedIds(rows.map(row => row.id))}
        onDetail={setDetail}
        onDelete={requestDelete}
      />
      <MaDrawer
        open={detail !== null}
        onOpenChange={open => {
          if (!open) setDetail(null)
        }}
        title={tx('操作日志详情')}
        description={tx('查看此条操作记录的完整信息。')}
        footer={false}
      >
        {detail && <OperationLogDetails row={detail} />}
      </MaDrawer>
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </section>
  )
}
