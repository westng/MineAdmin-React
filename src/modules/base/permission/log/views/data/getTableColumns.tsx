import { Eye, Trash2 } from 'lucide-react'
import type { MaProTableColumns, MaProTableModel, MaProTableOperationAction } from '@/components/ma-pro-table'
import type { UserLoginLogVo, UserOperationLogVo } from '../../api/log'
import { LoginStatus, LogText } from '../../components/LogRecordFields'

export interface LogTableColumnOptions<T extends MaProTableModel & { id: number }> {
  canDelete: boolean
  busy: boolean
  onDetail: (row: T) => void
  onDelete: (ids: number[]) => void
}

function withLogOperations<T extends MaProTableModel & { id: number }>(columns: MaProTableColumns<T>[], { canDelete, busy, onDetail, onDelete }: LogTableColumnOptions<T>): MaProTableColumns<T>[] {
  const actions: MaProTableOperationAction<T>[] = [
    { name: 'detail', text: '详情', icon: <Eye aria-hidden="true" />, disabled: () => busy, onClick: ({ row }) => onDetail(row) },
  ]
  if (canDelete) {
    actions.push({ name: 'delete', text: '删除', icon: <Trash2 aria-hidden="true" />, variant: 'destructive', disabled: () => busy, onClick: ({ row }) => onDelete([row.id]) })
  }
  return [
    ...(canDelete ? [{ type: 'selection' as const, width: 44 }] : []),
    ...columns,
    { type: 'operation', label: '操作', align: 'right', operationConfigure: { type: 'auto', actions } },
  ]
}

export function getLoginTableColumns(options: LogTableColumnOptions<UserLoginLogVo>): MaProTableColumns<UserLoginLogVo>[] {
  return withLogOperations([
    { prop: 'id', label: 'ID', width: 80 },
    { prop: 'username', label: '用户名', width: 140, cellRender: ({ row }) => <LogText value={row.username} /> },
    { prop: 'status', label: '登录状态', width: 100, cellRender: ({ row }) => <LoginStatus status={row.status} /> },
    { prop: 'ip', label: '登录 IP', width: 160, cellRender: ({ row }) => <LogText value={row.ip} /> },
    { prop: 'os', label: '操作系统', width: 140, cellRender: ({ row }) => <LogText value={row.os} /> },
    { prop: 'browser', label: '浏览器', width: 150, cellRender: ({ row }) => <LogText value={row.browser} /> },
    { prop: 'message', label: '提示消息', width: 180, cellRender: ({ row }) => <LogText value={row.message} /> },
    { prop: 'login_time', label: '登录时间', width: 190, cellRender: ({ row }) => <LogText value={row.login_time} /> },
  ], options)
}

export function getOperationTableColumns(options: LogTableColumnOptions<UserOperationLogVo>): MaProTableColumns<UserOperationLogVo>[] {
  return withLogOperations([
    { prop: 'id', label: 'ID', width: 80 },
    { prop: 'username', label: '用户名', width: 140, cellRender: ({ row }) => <LogText value={row.username} /> },
    { prop: 'service_name', label: '业务名称', width: 180, cellRender: ({ row }) => <LogText value={row.service_name} /> },
    { prop: 'method', label: '请求方式', width: 110, cellRender: ({ row }) => <LogText value={row.method} /> },
    { prop: 'router', label: '请求路由', width: 260, cellRender: ({ row }) => <LogText value={row.router} /> },
    { prop: 'ip', label: '请求 IP', width: 160, cellRender: ({ row }) => <LogText value={row.ip} /> },
    { prop: 'created_at', label: '操作时间', width: 190, cellRender: ({ row }) => <LogText value={row.created_at} /> },
  ], options)
}
