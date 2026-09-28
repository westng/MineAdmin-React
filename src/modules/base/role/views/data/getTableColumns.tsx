import { createTextTranslator } from '@/services/i18n/translator'
import { KeyRound, Pencil } from 'lucide-react'
import type { MaProTableColumns, MaProTableOperationAction } from '@/components/ma-pro-table'
import { Badge } from '@/components/reui/primitives/badge'
import type { RoleVo } from '../../api/role'
import type { AppRuntime } from '@/provider/runtime/types'
export interface RoleTableColumnActions {
  hasAuth: (permission: string | string[]) => boolean
  onEdit: (row: RoleVo) => void
  onPermissions: (row: RoleVo) => Promise<void>
  onDelete: (ids: number[]) => Promise<void>
}
export function createViewData(runtime: Pick<AppRuntime, 'i18n' | 'locales'>) {
  const tx = createTextTranslator(runtime, 'base.permission.role.ui')
  function getTableColumns({
    hasAuth,
    onEdit,
    onPermissions,
    onDelete,
  }: RoleTableColumnActions): MaProTableColumns<RoleVo>[] {
    const actions: MaProTableOperationAction<RoleVo>[] = [
      {
        name: 'permissions',
        show: () => hasAuth('permission:role:getMenu'),
        text: tx('权限'),
        icon: <KeyRound aria-hidden="true" />,
        onClick: ({ row }) => void onPermissions(row),
      },
      {
        name: 'edit',
        show: () => hasAuth('permission:role:update'),
        text: tx('编辑'),
        icon: <Pencil aria-hidden="true" />,
        onClick: ({ row }) => onEdit(row),
      },
      {
        name: 'delete',
        show: () => hasAuth('permission:role:delete'),
        text: tx('删除'),
        variant: 'destructive',
        disabled: ({ row }) => row.code === 'SuperAdmin',
        onClick: ({ row }) => void onDelete(row.id ? [row.id] : []),
      },
    ]
    return [
      { type: 'selection', width: 44 },
      { prop: 'name', label: tx('角色名称') },
      { prop: 'code', label: tx('角色编码') },
      { prop: 'sort', label: tx('排序'), width: 80 },
      {
        prop: 'status',
        label: tx('状态'),
        cellRender: ({ row }) => (
          <Badge variant={row.status === 1 ? 'default' : 'secondary'}>
            {row.status === 1 ? tx('启用') : row.status === 2 ? tx('禁用') : tx('未知')}
          </Badge>
        ),
      },
      { prop: 'remark', label: tx('备注') },
      {
        type: 'operation',
        label: tx('操作'),
        align: 'right',
        width: 240,
        operationConfigure: { type: 'auto', actions },
      },
    ]
  }
  return { getTableColumns }
}
