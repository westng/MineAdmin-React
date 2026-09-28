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
import { type UserLoginLogVo } from '../api/log'
import { LogProTable } from '@/modules/base/operation-log'
import { LoginLogDetails } from '@/modules/base/operation-log'
import { createLogSearchViewData } from '@/modules/base/operation-log'
import { createSearchItemsViewData } from '@/modules/base/operation-log'
import { createTableColumnsViewData } from '@/modules/base/operation-log'

export default function UserLoginLogPage() {
  const { toLoginLogParams } = useRuntimeFactory(createLogSearchViewData)
  const { getLoginSearchItems } = useRuntimeFactory(createSearchItemsViewData)
  const { getLoginTableColumns } = useRuntimeFactory(createTableColumnsViewData)

  const tx = useTextTranslator('base.login-log.ui')

  const { userLoginLogApi } = useRuntimeFactory(createApi)
  const requestLogs = useCallback(
    (params: Record<string, unknown>) => userLoginLogApi.page.queryOptions(toLoginLogParams(params)),
    [toLoginLogParams, userLoginLogApi.page],
  )
  const localeRevision = useLocaleRevision()
  void localeRevision
  const searchItems = getLoginSearchItems()

  const { hasAuth } = usePermission()
  const tableRef = useRef<MaProTableExpose<UserLoginLogVo>>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { toast } = useToast()
  const confirm = useMaConfirm({
    onError: error => toast.error(error instanceof Error ? error.message : tx('日志删除失败，请重试')),
  })
  function requestDelete(ids: number[]) {
    if (!ids.length || !hasAuth('log:userLogin:delete')) return
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
        if (!hasAuth('log:userLogin:delete')) return false
        const response = await userLoginLogApi.delete(selected)
        if (response.data.code !== 200) throw new Error(response.data.message || tx('日志删除失败'))
        setSelectedIds([])
        tableRef.current?.getTableRef()?.clearSelection()
        toast.success(tx('已删除 {0} 条日志', { '0': selected.length }))
        await tableRef.current?.search()
      },
    })
  }
  const [detail, setDetail] = useState<UserLoginLogVo | null>(null)

  if (!hasAuth('log:userLogin:list'))
    return (
      <div className="text-sm text-muted-foreground" role="status">
        {tx('暂无用户登录日志查看权限，请联系管理员。')}
      </div>
    )

  return (
    <section className="min-w-0 space-y-4" aria-label={tx('用户登录日志')}>
      <LogProTable
        tableRef={tableRef}
        title={tx('用户登录日志')}
        description={tx('查看登录结果、来源和登录环境。文本筛选为精确匹配，时间筛选需填写完整起止时间。')}
        listPermission="log:userLogin:list"
        queryOptions={requestLogs}
        searchItems={searchItems}
        getTableColumns={getLoginTableColumns}
        canDelete={hasAuth('log:userLogin:delete')}
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
        title={tx('登录日志详情')}
        description={tx('查看此条登录记录的完整信息。')}
        footer={false}
      >
        {detail && <LoginLogDetails row={detail} />}
      </MaDrawer>
      <MaDialog {...confirm.dialogProps} cancelText={tx('取消')} />
    </section>
  )
}
