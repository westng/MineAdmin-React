import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { PermissionGate, usePermission } from '@/hooks/framework/use-permission'
import { useUserQueries } from '../../hooks/use-user-queries'
import * as React from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/reui/primitives/button'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import type { UserVo } from '../../api/user'
import { emptySearch, getSearchItems, getTableColumns } from '../data'

const tx = createTextTranslator('base.permission.user.ui')

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
  const localeRevision = useLocaleRevision()
  void localeRevision

  usePermission()
  const { request } = useUserQueries()
  const searchItems = getSearchItems()
  const tableColumns = React.useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getTableColumns({ getUserTypeLabel, getStatusLabel, onEdit, onOpenRoles, onInitializePassword, onDelete })
  }, [getUserTypeLabel, getStatusLabel, onEdit, onOpenRoles, onInitializePassword, onDelete, localeRevision])
  React.useEffect(() => {
    proTableRef.current?.setTableColumns(tableColumns)
  }, [proTableRef, tableColumns])

  return (
    <MaProTable<UserVo>
      ref={proTableRef}
      schema={{ searchItems, tableColumns }}
      options={{
        header: { mainTitle: tx('用户管理'), subTitle: tx('管理用户资料、所属角色和数据权限。') },
        toolbar: true,
        searchOptions: { defaultValue: emptySearch, foldRows: 2 },
        searchFormOptions: { layout: 'grid', grid: { columns: 5, gap: '1rem' } },
        requestOptions: {
          api: params =>
            request({
              ...params,
              status: params.status ? (Number(params.status) as 1 | 2) : undefined,
            } as Partial<UserVo>),
          autoRequest: true,
          requestPage: { pageName: 'page', sizeName: 'page_size', size: 20 },
          response: { dataKey: 'list', totalKey: 'total' },
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
