import { createTextTranslator } from '@/provider/i18n'
import { hasAuth } from '@/hooks/framework/use-permission'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/reui/primitives/badge'
import type { MaProTableColumns, MaProTableOperationAction } from '@/components/ma-pro-table'
import type { UserVo } from '../../api/user'

const tx = createTextTranslator('base.permission.user.ui')

export interface UserTableColumnActions {
  getUserTypeLabel: (value: unknown) => string
  getStatusLabel: (value: unknown) => string
  onEdit: (row: UserVo) => void
  onOpenRoles: (row: UserVo) => void | Promise<void>
  onInitializePassword: (row: UserVo) => void | Promise<void>
  onDelete: (ids: number[]) => void | Promise<void>
}

export function getTableColumns({
  getUserTypeLabel,
  getStatusLabel,
  onEdit,
  onOpenRoles,
  onInitializePassword,
  onDelete,
}: UserTableColumnActions): MaProTableColumns<UserVo>[] {
  const actions: MaProTableOperationAction<UserVo>[] = [
    {
      name: 'edit',
      show: () => hasAuth('permission:user:update'),
      text: tx('编辑'),
      onClick: ({ row }) => onEdit(row),
    },
    {
      name: 'roles',
      show: () => hasAuth('permission:user:getRole'),
      text: tx('角色'),
      icon: <ShieldCheck className="size-3.5" aria-hidden="true" />,
      onClick: ({ row }) => void onOpenRoles(row),
    },
    {
      name: 'reset-password',
      show: () => hasAuth('permission:user:password'),
      text: tx('重置密码'),
      onClick: ({ row }) => void onInitializePassword(row),
    },
    {
      name: 'delete',
      show: () => hasAuth('permission:user:delete'),
      text: tx('删除'),
      variant: 'destructive',
      disabled: ({ row }) => row.id === 1,
      onClick: ({ row }) => void onDelete(row.id ? [row.id] : []),
    },
  ]
  return [
    { type: 'selection', width: 44, label: '' },
    {
      prop: 'username',
      label: tx('用户名'),
      cellRender: ({ row }) => <span className="font-medium">{row.username || '-'}</span>,
    },
    { prop: 'nickname', label: tx('昵称'), cellRender: ({ row }) => row.nickname || '-' },
    {
      prop: 'user_type',
      label: tx('用户类型'),
      cellRender: ({ row }) => <Badge variant="outline">{getUserTypeLabel(row.user_type) || tx('普通用户')}</Badge>,
    },
    { prop: 'phone', label: tx('手机号'), cellRender: ({ row }) => row.phone || '-' },
    { prop: 'email', label: tx('邮箱'), cellRender: ({ row }) => row.email || '-' },
    {
      prop: 'status',
      label: tx('状态'),
      cellRender: ({ row }) => (
        <Badge variant={row.status === 1 ? 'default' : 'secondary'}>{getStatusLabel(row.status)}</Badge>
      ),
    },
    { type: 'operation', label: tx('操作'), align: 'right', width: 240, operationConfigure: { type: 'auto', actions } },
  ]
}
