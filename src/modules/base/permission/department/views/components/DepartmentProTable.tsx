import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useEffect, useMemo, useRef } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableExpose } from '@/components/ma-pro-table'
import type { MaTablePagination } from '@/components/ma-table'
import { Button } from '@/components/reui/primitives/button'
import { useToast } from '@/components/reui/use-toast'
import { PermissionGate, usePermission } from '@/hooks/framework/use-permission'
import type { DepartmentVo } from '../../api/department'
import type { DepartmentRow } from '../data/department-tree'
import { getDepartmentTableColumns } from '../data/getTableColumns'

const tx = createTextTranslator('base.permission.department.ui')

interface Props {
  rows: DepartmentRow[]
  total: number
  pagination: Required<Pick<MaTablePagination, 'currentPage' | 'pageSize' | 'total' | 'onChange'>>
  loading: boolean
  error: string
  selectedIds: number[]
  collapsedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onToggle: (id: number) => void
  onToggleAll: () => void
  onCreate: (parent?: DepartmentVo) => void
  onEdit: (row: DepartmentVo) => void
  onDetails: (row: DepartmentVo) => void
  onLeaders: (row: DepartmentVo) => void
  onPositions: (row: DepartmentVo) => void
  onDelete: (ids: number[]) => Promise<void>
  onSearch: (name: string) => void
  onRefresh: () => void
}

export default function DepartmentProTable({
  rows,
  total,
  pagination,
  loading,
  error,
  selectedIds,
  collapsedIds,
  onSelectionChange,
  onToggle,
  onToggleAll,
  onCreate,
  onEdit,
  onDetails,
  onLeaders,
  onPositions,
  onDelete,
  onSearch,
  onRefresh,
}: Props) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const tableRef = useRef<MaProTableExpose<DepartmentRow>>(null)
  const { toast } = useToast()
  const { hasAuth } = usePermission()
  const canManageLeaders = hasAuth('permission:leader:index')
  const canManagePositions = hasAuth('permission:position:index')
  const { currentPage, pageSize, total: rootTotal, onChange: onPageChange } = pagination
  useEffect(() => {
    // The module pages whole subtrees; the table only renders that page and its controls.
    tableRef.current
      ?.getTableRef()
      ?.setPagination({ currentPage, pageSize, total: rootTotal, onChange: onPageChange, disabled: loading })
  }, [currentPage, pageSize, rootTotal, onPageChange, loading])
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getDepartmentTableColumns({
      rows,
      selectedIds,
      collapsedIds,
      loading,
      canManageLeaders,
      canManagePositions,
      onSelectionChange,
      onToggle,
      onCreate,
      onEdit,
      onDetails,
      onLeaders,
      onPositions,
      onDelete,
    })
  }, [
    rows,
    selectedIds,
    collapsedIds,
    loading,
    canManageLeaders,
    canManagePositions,
    onSelectionChange,
    onToggle,
    onCreate,
    onEdit,
    onDetails,
    onLeaders,
    onPositions,
    onDelete,
    localeRevision,
  ])
  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns])

  return (
    <MaProTable<DepartmentRow>
      ref={tableRef}
      data={rows}
      loading={loading}
      schema={{ tableColumns: columns, searchItems: [{ prop: 'name', label: tx('部门名称'), render: 'Input' }] }}
      options={{
        header: { mainTitle: tx('部门管理'), subTitle: tx('维护组织树、部门负责人、岗位和部门用户关系。') },
        toolbar: true,
        searchOptions: { defaultValue: { name: '' }, foldButtonShow: false },
        onSearchSubmit: form => {
          onSearch(typeof form.name === 'string' ? form.name.trim() : '')
        },
        onSearchReset: () => {
          onSearch('')
          toast(tx('筛选条件已重置'))
        },
        tableOptions: {
          rowKey: row => row.department.id ?? `${row.depth}-${row.department.name}`,
          showPagination: true,
          pagination: { ...pagination, pageSizes: [10, 20, 50, 100], hideOnSinglePage: false, disabled: loading },
          className: 'min-w-[1200px]',
          emptyText: tx('暂无部门数据'),
        },
      }}
      toolbarLeft={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="permission:department:save">
            <Button type="button" size="sm" onClick={() => onCreate()}>
              <Plus aria-hidden="true" />
              {tx('新增部门')}
            </Button>
          </PermissionGate>
          <PermissionGate permission="permission:department:delete">
            <Button
              variant="destructive"
              size="sm"
              disabled={!selectedIds.length || loading}
              onClick={() => void onDelete(selectedIds)}
            >
              <Trash2 aria-hidden="true" />
              {tx('批量删除')}
            </Button>
          </PermissionGate>
          <span className="text-sm text-muted-foreground">
            {tx('共')}
            {total} {tx('个部门 · 按顶级部门分页')}
          </span>
          <Button variant="ghost" size="sm" onClick={onToggleAll}>
            {collapsedIds.length ? tx('展开全部') : tx('折叠全部')}
          </Button>
        </div>
      }
      toolbarRight={
        <Button variant="outline" size="sm" disabled={loading} onClick={onRefresh}>
          <RefreshCw aria-hidden="true" />
          {tx('刷新')}
        </Button>
      }
      empty={
        error ? (
          <span role="alert" className="text-destructive">
            {error}
          </span>
        ) : undefined
      }
    />
  )
}
