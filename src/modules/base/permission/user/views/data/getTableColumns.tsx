import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MaProTableColumns } from '@/components/ma-pro-table'
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
  return [
    { type: 'selection', width: 44, label: '' },
    { prop: 'username', label: '用户名', cellRender: ({ row }) => <span className="font-medium">{row.username || '-'}</span> },
    { prop: 'nickname', label: '昵称', cellRender: ({ row }) => row.nickname || '-' },
    { prop: 'user_type', label: '用户类型', cellRender: ({ row }) => <Badge variant="outline">{getUserTypeLabel(row.user_type) || '普通用户'}</Badge> },
    { prop: 'phone', label: '手机号', cellRender: ({ row }) => row.phone || '-' },
    { prop: 'email', label: '邮箱', cellRender: ({ row }) => row.email || '-' },
    { prop: 'status', label: '状态', cellRender: ({ row }) => <Badge variant={row.status === 1 ? 'default' : 'secondary'}>{getStatusLabel(row.status)}</Badge> },
    {
      label: '操作',
      align: 'right',
      cellRender: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={() => void onOpenRoles(row)}><ShieldCheck className="size-3.5" aria-hidden="true" />角色</Button>
          <Button variant="ghost" size="sm" onClick={() => void onInitializePassword(row)}>重置密码</Button>
          <Button variant="ghost" size="sm" className="text-destructive" disabled={row.id === 1} onClick={() => void onDelete(row.id ? [row.id] : [])}>删除</Button>
        </div>
      ),
    },
  ]
}
