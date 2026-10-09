import { useMemo, type RefObject } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { useToast } from '@/components/reui/use-toast'
import { usePermission } from '@/hooks/auth/use-permission'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { PermissionGate } from '@/provider/access/permission-gate'
import { createApi as createRoleApi, type RoleVo } from '../../api/role'
import { emptySearch, getSearchItems, toRoleQueryParams } from '../data/getSearchItems'
import { createViewData as createTableColumnsViewData } from '../data/getTableColumns'

interface Props {
  tableRef: RefObject<MaProTableExpose<RoleVo> | null>
  selectedIds: number[]
  onSelectionChange: (rows: RoleVo[]) => void
  onCreate: () => void
  onEdit: (row: RoleVo) => void
  onPermissions: (row: RoleVo) => void
  onDelete: (ids: number[]) => Promise<void>
}

export default function RoleProTable({
  tableRef,
  selectedIds,
  onSelectionChange,
  onCreate,
  onEdit,
  onPermissions,
  onDelete,
}: Props) {
  const { getTableColumns } = useRuntimeFactory(createTableColumnsViewData)

  const tx = useTextTranslator('base.permission.role.ui')

  const { page } = useRuntimeFactory(createRoleApi)

  const localeRevision = useLocaleRevision()
  void localeRevision

  const { hasAuth } = usePermission()
  const { toast } = useToast()
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getTableColumns({ hasAuth, onEdit, onPermissions, onDelete })
  }, [localeRevision, getTableColumns, hasAuth, onEdit, onPermissions, onDelete])

  return (
    <MaProTable<RoleVo>
      ref={tableRef}
      schema={{
        tableColumns: columns,
        searchItems: getSearchItems(tx),
      }}
      options={{
        header: { mainTitle: tx('角色管理'), subTitle: tx('维护角色编码并配置菜单权限。') },
        toolbar: true,
        searchOptions: { defaultValue: emptySearch, foldButtonShow: false },
        onSearchReset: () => {
          toast(tx('筛选条件已重置'))
        },
        requestOptions: { api: page, paramsTransform: toRoleQueryParams, requestPage: { size: 20 } },
        tableOptions: {
          rowKey: 'id',
          className: 'min-w-[900px]',
          emptyText: tx('暂无角色数据'),
        },
      }}
      toolbarLeft={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="permission:role:save">
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus aria-hidden="true" />
              {tx('新增角色')}
            </Button>
          </PermissionGate>
          <PermissionGate permission="permission:role:delete">
            <Button
              variant="destructive"
              size="sm"
              disabled={!selectedIds.length}
              onClick={() => void onDelete(selectedIds)}
            >
              <Trash2 aria-hidden="true" />
              {tx('批量删除')}
            </Button>
          </PermissionGate>
        </div>
      }
      onSelectionChange={onSelectionChange}
    />
  )
}
