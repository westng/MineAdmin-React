import { useRuntimeFactory } from '@/hooks/runtime/use-runtime-factory'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { PermissionGate } from '@/provider/access/permission-gate'
import { usePermission } from '@/hooks/auth/use-permission'
import { useUserQueries } from '../../hooks/use-user-queries'
import * as React from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import type { UserVo } from '../../api/user'
import { createViewData as createSearchItemsViewData } from '../data/getSearchItems'
import { createViewData as createTableColumnsViewData } from '../data/getTableColumns'

interface UserProTableProps {
  proTableRef: React.RefObject<MaProTableExpose<UserVo> | null>
  selectedIds: number[]
  getUserTypeLabel: (value: unknown) => string
  getStatusLabel: (value: unknown) => string
  onSelectionChange: (rows: UserVo[]) => void
  onRefresh: () => void | Promise<void>
  onCreate: () => void
  onEdit: (row: UserVo) => void
  onOpenRoles: (row: UserVo) => void | Promise<void>
  onInitializePassword: (row: UserVo) => void | Promise<void>
  onDelete: (ids: number[]) => void | Promise<void>
}

export default function UserProTable({
  proTableRef,
  selectedIds,
  getUserTypeLabel,
  getStatusLabel,
  onSelectionChange,
  onRefresh,
  onCreate,
  onEdit,
  onOpenRoles,
  onInitializePassword,
  onDelete,
}: UserProTableProps) {
  const { emptySearch, getSearchItems } = useRuntimeFactory(createSearchItemsViewData)
  const { getTableColumns } = useRuntimeFactory(createTableColumnsViewData)

  const tx = useTextTranslator('base.permission.user.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const { hasAuth } = usePermission()
  const { request, sessionVersion, data, total, loading, error } = useUserQueries()
  const searchItems = getSearchItems()
  const tableColumns = React.useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getTableColumns({
      hasAuth,
      getUserTypeLabel,
      getStatusLabel,
      onEdit,
      onOpenRoles,
      onInitializePassword,
      onDelete,
    })
  }, [
    localeRevision,
    getTableColumns,
    hasAuth,
    getUserTypeLabel,
    getStatusLabel,
    onEdit,
    onOpenRoles,
    onInitializePassword,
    onDelete,
  ])

  return (
    <MaProTable<UserVo>
      ref={proTableRef}
      data={data}
      loading={loading}
      error={error}
      schema={{ searchItems, tableColumns }}
      options={{
        header: { mainTitle: tx('用户管理'), subTitle: tx('管理用户资料、所属角色和数据权限。') },
        toolbar: true,
        searchOptions: { defaultValue: emptySearch, foldRows: 2 },
        searchFormOptions: { layout: 'grid', grid: { columns: 5, gap: '1rem' } },
        tableOptions: { pagination: { total } },
        requestOptions: {
          requestKey: sessionVersion,
          api: params =>
            request({
              ...params,
              status: params.status ? (Number(params.status) as 1 | 2) : undefined,
            } as Partial<UserVo>),
          requestPage: { size: 20 },
        },
      }}
      toolbarLeft={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="permission:user:save">
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus aria-hidden="true" />
              {tx('新增用户')}
            </Button>
          </PermissionGate>
          <PermissionGate permission="permission:user:delete">
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
      toolbarRight={
        <Button variant="outline" size="sm" onClick={() => void onRefresh()}>
          <RefreshCw aria-hidden="true" />
          {tx('刷新')}
        </Button>
      }
      onSelectionChange={onSelectionChange}
    />
  )
}
