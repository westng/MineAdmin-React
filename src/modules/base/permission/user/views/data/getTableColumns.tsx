import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { MaProTableColumns, MaProTableOperationAction } from '@/components/ma-pro-table'
import type { UserVo } from '../../api/user'

export interface UserTableColumnActions {
  getUserTypeLabel: (value: unknown) => string
  getStatusLabel: (value: unknown) => string
  onEdit: (row: UserVo) => void
  onOpenRoles: (row: UserVo) => void | Promise<void>
  onInitializePassword: (row: UserVo) => void | Promise<void>
  onDelete: (ids: number[]) => void | Promise<void>
}

export function getTableColumns({ getUserTypeLabel, getStatusLabel, onEdit, onOpenRoles, onInitializePassword, onDelete }: UserTableColumnActions): MaProTableColumns<UserVo>[] {
  const actions: MaProTableOperationAction<UserVo>[] = [
    { name: 'edit', text: '编辑', onClick: ({ row }) => onEdit(row) },
    { name: 'roles', text: '角色', icon: <ShieldCheck className="size-3.5" aria-hidden="true" />, onClick: ({ row }) => void onOpenRoles(row) },
    { name: 'reset-password', text: '重置密码', onClick: ({ row }) => void onInitializePassword(row) },
    { name: 'delete', text: '删除', variant: 'destructive', disabled: ({ row }) => row.id === 1, onClick: ({ row }) => void onDelete(row.id ? [row.id] : []) },
  ]
  return [
    { type: 'selection', width: 44, label: '' },
    { prop: 'username', label: '用户名', cellRender: ({ row }) => <span className="font-medium">{row.username || '-'}</span> },
    { prop: 'nickname', label: '昵称', cellRender: ({ row }) => row.nickname || '-' },
    { prop: 'user_type', label: '用户类型', cellRender: ({ row }) => <Badge variant="outline">{getUserTypeLabel(row.user_type) || '普通用户'}</Badge> },
    { prop: 'phone', label: '手机号', cellRender: ({ row }) => row.phone || '-' },
    { prop: 'email', label: '邮箱', cellRender: ({ row }) => row.email || '-' },
    { prop: 'status', label: '状态', cellRender: ({ row }) => <Badge variant={row.status === 1 ? 'default' : 'secondary'}>{getStatusLabel(row.status)}</Badge> },
    { type: 'operation', label: '操作', align: 'right', width: 240, operationConfigure: { type: 'auto', actions } },
  ]
}
