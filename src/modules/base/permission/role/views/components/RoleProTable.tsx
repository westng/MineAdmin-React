import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { PermissionGate, usePermission } from '@/hooks/framework/use-permission'
import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import { Button } from '@/components/reui/primitives/button'
import { useToast } from '@/components/reui/use-toast'
import { page, type RoleVo } from '../../api/role'
import { getTableColumns } from '../data/getTableColumns'

const tx = createTextTranslator('base.permission.role.ui')

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
  const localeRevision = useLocaleRevision()
  void localeRevision

  usePermission()
  const { toast } = useToast()
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getTableColumns({ onEdit, onPermissions, onDelete })
  }, [onDelete, onEdit, onPermissions, localeRevision])

  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns, tableRef])

  const request = useCallback(
    async (params: Record<string, unknown>) => {
      tableRef.current?.getTableRef()?.clearSelection()
      const response = await page({
        page: Number(params.page ?? 1),
        page_size: Number(params.page_size ?? 20),
        name: typeof params.name === 'string' ? params.name.trim() : undefined,
        code: typeof params.code === 'string' ? params.code.trim() : undefined,
        status: params.status ? Number(params.status) : undefined,
      })
      if (response.data.code !== 200) throw new Error(response.data.message || tx('角色列表加载失败'))
      return response
    },
    [tableRef],
  )

  return (
    <MaProTable<RoleVo>
      ref={tableRef}
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
        requestOptions: { api: request, requestPage: { size: 20 } },
        tableOptions: { rowKey: 'id', className: 'min-w-[900px]', emptyText: tx('暂无角色数据') },
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
