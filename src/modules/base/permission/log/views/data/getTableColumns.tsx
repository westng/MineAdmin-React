import { createTextTranslator } from '@/provider/i18n'
import { Eye, Trash2 } from 'lucide-react'
import type { MaProTableColumns, MaProTableModel, MaProTableOperationAction } from '@/components/ma-pro-table'
import type { UserLoginLogVo, UserOperationLogVo } from '../../api/log'
import { LoginStatus, LogText } from '../../components/LogRecordFields'

const tx = createTextTranslator('base.permission.log.ui')

export interface LogTableColumnOptions<T extends MaProTableModel & { id: number }> {
  canDelete: boolean
  busy: boolean
  onDetail: (row: T) => void
  onDelete: (ids: number[]) => void
}

function withLogOperations<T extends MaProTableModel & { id: number }>(
  columns: MaProTableColumns<T>[],
  { canDelete, busy, onDetail, onDelete }: LogTableColumnOptions<T>,
): MaProTableColumns<T>[] {
  const actions: MaProTableOperationAction<T>[] = [
    {
      name: 'detail',
      text: tx('详情'),
      icon: <Eye aria-hidden="true" />,
      disabled: () => busy,
      onClick: ({ row }) => onDetail(row),
    },
  ]
  if (canDelete) {
    actions.push({
      name: 'delete',
      text: tx('删除'),
      icon: <Trash2 aria-hidden="true" />,
      variant: 'destructive',
      disabled: () => busy,
      onClick: ({ row }) => onDelete([row.id]),
    })
  }
  return [
    ...(canDelete ? [{ type: 'selection' as const, width: 44 }] : []),
    ...columns,
    { type: 'operation', label: tx('操作'), align: 'right', operationConfigure: { type: 'auto', actions } },
  ]
}

export function getLoginTableColumns(
  options: LogTableColumnOptions<UserLoginLogVo>,
): MaProTableColumns<UserLoginLogVo>[] {
  return withLogOperations(
    [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'username', label: tx('用户名'), width: 140, cellRender: ({ row }) => <LogText value={row.username} /> },
      {
        prop: 'status',
        label: tx('登录状态'),
        width: 100,
        cellRender: ({ row }) => <LoginStatus status={row.status} />,
      },
      { prop: 'ip', label: tx('登录 IP'), width: 160, cellRender: ({ row }) => <LogText value={row.ip} /> },
      { prop: 'os', label: tx('操作系统'), width: 140, cellRender: ({ row }) => <LogText value={row.os} /> },
      { prop: 'browser', label: tx('浏览器'), width: 150, cellRender: ({ row }) => <LogText value={row.browser} /> },
      { prop: 'message', label: tx('提示消息'), width: 180, cellRender: ({ row }) => <LogText value={row.message} /> },
      {
        prop: 'login_time',
        label: tx('登录时间'),
        width: 190,
        cellRender: ({ row }) => <LogText value={row.login_time} />,
      },
    ],
    options,
  )
}

export function getOperationTableColumns(
  options: LogTableColumnOptions<UserOperationLogVo>,
): MaProTableColumns<UserOperationLogVo>[] {
  return withLogOperations(
    [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'username', label: tx('用户名'), width: 140, cellRender: ({ row }) => <LogText value={row.username} /> },
      {
        prop: 'service_name',
        label: tx('业务名称'),
        width: 180,
        cellRender: ({ row }) => <LogText value={row.service_name} />,
      },
      { prop: 'method', label: tx('请求方式'), width: 110, cellRender: ({ row }) => <LogText value={row.method} /> },
      { prop: 'router', label: tx('请求路由'), width: 260, cellRender: ({ row }) => <LogText value={row.router} /> },
      { prop: 'ip', label: tx('请求 IP'), width: 160, cellRender: ({ row }) => <LogText value={row.ip} /> },
      {
        prop: 'created_at',
        label: tx('操作时间'),
        width: 190,
        cellRender: ({ row }) => <LogText value={row.created_at} />,
      },
    ],
    options,
  )
}
