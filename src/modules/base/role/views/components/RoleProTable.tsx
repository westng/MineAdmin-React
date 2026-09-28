import { useQueryTable } from '@/hooks/query/use-query-table'
import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { createApi as createRoleApi } from '@/modules/base/role/api/role'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { PermissionGate } from '@/provider/access/permission-gate'
import { usePermission } from '@/hooks/auth/use-permission'
import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { useToast } from '@/components/reui/use-toast'
import { type RoleVo } from '../../api/role'
import { createViewData as createTableColumnsViewData } from '../data/getTableColumns'

interface Props {
  tableRef: RefObject<MaProTableExpose<RoleVo> | null>
  selectedIds: number[]
  onSelectionChange: (rows: RoleVo[]) => void
  onCreate: () => void
  onEdit: (row: RoleVo) => void
  onPermissions: (row: RoleVo) => Promise<void>
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

  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns, tableRef])

  const queryOptions = useCallback(
    (params: Record<string, unknown>) =>
      page.queryOptions({
        ...params,
        name: typeof params.name === 'string' ? params.name.trim() : undefined,
        code: typeof params.code === 'string' ? params.code.trim() : undefined,
        status: params.status ? Number(params.status) : undefined,
      }),
    [page],
  )
  const query = useQueryTable<RoleVo>(queryOptions)

  return (
    <MaProTable<RoleVo>
      ref={tableRef}
      data={query.data}
      loading={query.loading}
      error={query.error}
      schema={{
        tableColumns: columns,
        searchItems: [
          { prop: 'name', label: tx('角色名称'), render: 'Input' },
          { prop: 'code', label: tx('角色编码'), render: 'Input' },
          {
            prop: 'status',
            label: tx('状态'),
            render: 'Select',
            renderProps: {
              options: [
                { label: tx('启用'), value: '1' },
                { label: tx('禁用'), value: '2' },
              ],
            },
          },
        ],
      }}
      options={{
        header: { mainTitle: tx('角色管理'), subTitle: tx('维护角色编码并配置菜单权限。') },
        toolbar: true,
        searchOptions: { defaultValue: { name: '', code: '', status: '' }, foldButtonShow: false },
        onSearchReset: () => {
          toast(tx('筛选条件已重置'))
        },
        requestOptions: { api: query.request, requestKey: query.sessionVersion, requestPage: { size: 20 } },
        tableOptions: {
          pagination: { total: query.total },
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
