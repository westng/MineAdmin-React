import { Pencil, Trash2, UserRoundMinus } from 'lucide-react'
import type { MaProTableColumns, MaProTableOperationAction } from '@/components/ma-pro-table'
import type { LeaderRecord } from '../../api/leader'
import type { PositionVo } from '../../api/position'

export function getLeaderPickerTableColumns(): MaProTableColumns[] {
  return [
    { type: 'selection', width: 44 },
    { prop: 'username', label: '用户名' },
    { prop: 'nickname', label: '昵称' },
  ]
}

export function getLeaderTableColumns({ canRemove, busy, onRemove }: { canRemove: boolean; busy: boolean; onRemove: (row: LeaderRecord) => void }): MaProTableColumns<LeaderRecord>[] {
  return [
    { label: '用户名', cellRender: ({ row }) => row.user?.username || `用户 #${row.user_id}` },
    { label: '昵称', cellRender: ({ row }) => row.user?.nickname || (row.user ? '-' : '用户已不可用') },
    ...(canRemove ? [{ type: 'operation' as const, label: '操作', align: 'right' as const, width: 100, operationConfigure: { type: 'auto' as const, actions: [{ name: 'remove', text: '移除', icon: <UserRoundMinus aria-hidden="true" />, variant: 'destructive' as const, disabled: () => busy, onClick: ({ row }: { row: LeaderRecord }) => onRemove(row) }] satisfies MaProTableOperationAction<LeaderRecord>[] } }] : []),
  ]
}

export function getPositionTableColumns({ canEdit, canDelete, busy, onEdit, onDelete }: { canEdit: boolean; canDelete: boolean; busy: boolean; onEdit: (row: PositionVo) => void; onDelete: (row: PositionVo) => void }): MaProTableColumns<PositionVo>[] {
  const actions: MaProTableOperationAction<PositionVo>[] = [
    ...(canEdit ? [{ name: 'edit', text: '编辑', icon: <Pencil aria-hidden="true" />, disabled: ({ row }: { row: PositionVo }) => busy || !row.id, onClick: ({ row }: { row: PositionVo }) => onEdit(row) }] : []),
    ...(canDelete ? [{ name: 'delete', text: '删除', icon: <Trash2 aria-hidden="true" />, variant: 'destructive' as const, disabled: ({ row }: { row: PositionVo }) => busy || !row.id, onClick: ({ row }: { row: PositionVo }) => onDelete(row) }] : []),
  ]
  return [
    { prop: 'name', label: '岗位名称' },
    ...(actions.length ? [{ type: 'operation' as const, label: '操作', align: 'right' as const, width: 170, operationConfigure: { type: 'auto' as const, actions } }] : []),
  ]
}
