import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useState } from 'react'
import { MaDrawer } from '@/components/ma-drawer'
import { usePermission } from '@/hooks/framework/use-permission'
import { userOperationLogApi, type UserOperationLogVo } from '../api/log'
import { LogDeleteDialog } from './components/LogDeleteDialog'
import { LogProTable } from './components/LogProTable'
import { OperationLogDetails } from './components/LogRecordFields'
import { useLogManagement } from './data/use-log-management'
import { toOperationLogParams } from './data/log-search'
import { getOperationSearchItems } from './data/getSearchItems'
import { getOperationTableColumns } from './data/getTableColumns'

const tx = createTextTranslator('base.permission.log.ui')

const requestLogs = (params: Record<string, unknown>) => userOperationLogApi.page(toOperationLogParams(params))

export default function UserOperationLogPage() {
  const localeRevision = useLocaleRevision()
  void localeRevision
  const searchItems = getOperationSearchItems()

  const { hasAuth } = usePermission()
  const logs = useLogManagement<UserOperationLogVo>(userOperationLogApi.delete, 'log:userOperation:delete')
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
        tableRef={logs.tableRef}
        title={tx('操作日志')}
        description={tx('查看用户请求、业务操作和操作时间。文本筛选为精确匹配，时间筛选需填写完整起止时间。')}
        listPermission="log:userOperation:list"
        api={requestLogs}
        searchItems={searchItems}
        getTableColumns={getOperationTableColumns}
        canDelete={logs.canDelete}
        deleting={logs.deleting}
        selectedIds={logs.selectedIds}
        onSelectionChange={logs.onSelectionChange}
        onDetail={setDetail}
        onDelete={logs.requestDelete}
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
      <LogDeleteDialog
        ids={logs.deleteIds}
        pending={logs.deleting}
        onClose={logs.closeDelete}
        onConfirm={logs.confirmDelete}
      />
    </section>
  )
}
