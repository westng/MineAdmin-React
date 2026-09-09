import { useState } from 'react'
import { MaDrawer } from '@/components/ma-drawer'
import { usePermission } from '@/hooks/usePermission'
import { userLoginLogApi, type UserLoginLogVo } from '../api/log'
import { LogDeleteDialog } from '../components/LogDeleteDialog'
import { LogProTable } from '../components/LogProTable'
import { LoginLogDetails } from '../components/LogRecordFields'
import { useLogManagement } from '../hooks/use-log-management'
import { toLoginLogParams } from '../utils/log-search'
import { loginColumns, loginSearchItems } from './data/log-schema'

const requestLogs = (params: Record<string, unknown>) => userLoginLogApi.page(toLoginLogParams(params))
const schema = { tableColumns: loginColumns, searchItems: loginSearchItems }

export default function UserLoginLogPage() {
  const { hasAuth } = usePermission()
  const logs = useLogManagement<UserLoginLogVo>(userLoginLogApi.delete, 'log:userLogin:delete')
  const [detail, setDetail] = useState<UserLoginLogVo | null>(null)

  if (!hasAuth('log:userLogin:list')) return <div className="text-sm text-muted-foreground" role="status">暂无用户登录日志查看权限，请联系管理员。</div>

  return <section className="min-w-0 space-y-4" aria-label="用户登录日志">
    <LogProTable
      tableRef={logs.tableRef}
      title="用户登录日志"
      description="查看登录结果、来源和登录环境。文本筛选为精确匹配，时间筛选需填写完整起止时间。"
      listPermission="log:userLogin:list"
      api={requestLogs}
      schema={schema}
      canDelete={logs.canDelete}
      deleting={logs.deleting}
      selectedIds={logs.selectedIds}
      onSelectionChange={logs.onSelectionChange}
      onDetail={setDetail}
      onDelete={logs.requestDelete}
    />
    <MaDrawer open={detail !== null} onOpenChange={open => { if (!open) setDetail(null) }} title="登录日志详情" description="查看此条登录记录的完整信息。" footer={false}>
      {detail && <LoginLogDetails row={detail} />}
    </MaDrawer>
    <LogDeleteDialog ids={logs.deleteIds} pending={logs.deleting} onClose={logs.closeDelete} onConfirm={logs.confirmDelete} />
  </section>
}
