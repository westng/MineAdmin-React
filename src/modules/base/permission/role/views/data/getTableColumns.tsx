import { KeyRound, Pencil } from 'lucide-react'
import type { MaProTableColumns, MaProTableOperationAction } from '@/components/ma-pro-table'
import { Badge } from '@/components/ui/badge'
import type { RoleVo } from '../../api/role'

export interface RoleTableColumnActions {
  onEdit: (row: RoleVo) => void
  onPermissions: (row: RoleVo) => Promise<void>
  onDelete: (ids: number[]) => Promise<void>
}

export function getTableColumns({ onEdit, onPermissions, onDelete }: RoleTableColumnActions): MaProTableColumns<RoleVo>[] {
  const actions: MaProTableOperationAction<RoleVo>[] = [
    { name: 'permissions', text: '权限', icon: <KeyRound aria-hidden="true" />, onClick: ({ row }) => void onPermissions(row) },
    { name: 'edit', text: '编辑', icon: <Pencil aria-hidden="true" />, onClick: ({ row }) => onEdit(row) },
    { name: 'delete', text: '删除', variant: 'destructive', disabled: ({ row }) => row.code === 'SuperAdmin', onClick: ({ row }) => void onDelete(row.id ? [row.id] : []) },
  ]
  return [
    { type: 'selection', width: 44 },
    { prop: 'name', label: '角色名称' },
    { prop: 'code', label: '角色编码' },
    { prop: 'sort', label: '排序', width: 80 },
    { prop: 'status', label: '状态', cellRender: ({ row }) => <Badge variant={row.status === 1 ? 'default' : 'secondary'}>{row.status === 1 ? '启用' : row.status === 2 ? '禁用' : '未知'}</Badge> },
    { prop: 'remark', label: '备注' },
    { type: 'operation', label: '操作', align: 'right', width: 240, operationConfigure: { type: 'auto', actions } },
  ]
}
