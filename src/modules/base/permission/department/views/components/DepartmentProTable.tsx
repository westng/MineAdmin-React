import { useEffect, useMemo, useRef } from 'react'
import { BriefcaseBusiness, ChevronRight, Eye, Pencil, Plus, RefreshCw, Trash2, UserRoundCog } from 'lucide-react'
import { MaProTable, type MaProTableColumns, type MaProTableExpose } from '@/components/ma-pro-table'
import type { MaTablePagination } from '@/components/ma-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/common/use-toast'
import { usePermission } from '@/hooks/usePermission'
import type { DepartmentVo } from '../../api/department'
import type { DepartmentRow } from '../data/department-tree'

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

function relationCount(value: unknown) { return Array.isArray(value) ? value.length : 0 }
function formatDate(value: string | null | undefined) { return value ? value.replace('T', ' ').slice(0, 19) : '-' }

export default function DepartmentProTable({ rows, total, pagination, loading, error, selectedIds, collapsedIds, onSelectionChange, onToggle, onToggleAll, onCreate, onEdit, onDetails, onLeaders, onPositions, onDelete, onSearch, onRefresh }: Props) {
  const tableRef = useRef<MaProTableExpose<DepartmentRow>>(null)
  const { toast } = useToast()
  const { hasAuth } = usePermission()
  const canManageLeaders = hasAuth('permission:leader:index')
  const canManagePositions = hasAuth('permission:position:index')
  const { currentPage, pageSize, total: rootTotal, onChange: onPageChange } = pagination
  useEffect(() => {
    // The module pages whole subtrees; the table only renders that page and its controls.
    tableRef.current?.getTableRef()?.setPagination({ currentPage, pageSize, total: rootTotal, onChange: onPageChange, disabled: loading })
  }, [currentPage, pageSize, rootTotal, onPageChange, loading])
  const columns = useMemo<MaProTableColumns<DepartmentRow>[]>(() => {
    const selectableIds = rows.flatMap(row => row.department.id ? [row.department.id] : [])
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id))
    return [
      { width: 44, label: '', headerRender: () => <Checkbox checked={allSelected} indeterminate={!allSelected && selectableIds.some(id => selectedIds.includes(id))} disabled={loading || !selectableIds.length} onCheckedChange={checked => onSelectionChange(checked ? selectableIds : [])} aria-label="选择本页部门" />, cellRender: ({ row: { department } }) => <Checkbox checked={Boolean(department.id && selectedIds.includes(department.id))} disabled={loading || !department.id} onCheckedChange={checked => { if (department.id) onSelectionChange(checked ? [...selectedIds, department.id] : selectedIds.filter(id => id !== department.id)) }} aria-label={`选择 ${department.name || '部门'}`} /> },
      { label: '部门名称', width: 280, cellRender: ({ row: { department, depth } }) => {
        const collapsed = Boolean(department.id && collapsedIds.includes(department.id))
        return <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>
          {department.children?.length ? <Button variant="ghost" size="icon-xs" aria-expanded={!collapsed} aria-label={collapsed ? '展开子部门' : '折叠子部门'} onClick={() => { if (department.id) onToggle(department.id) }}><ChevronRight className={`size-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} /></Button> : <span className="inline-block size-6" />}
          <span className="font-medium">{department.name || '-'}</span>{depth === 0 && <Badge variant="outline" className="ml-1">根部门</Badge>}
        </div>
      } },
      { label: '负责人', cellRender: ({ row }) => relationCount(row.department.leader) },
      { label: '岗位', cellRender: ({ row }) => relationCount(row.department.positions) },
      { label: '用户', cellRender: ({ row }) => relationCount(row.department.department_users) },
      { label: '创建时间', cellRender: ({ row }) => formatDate(row.department.created_at) },
      { label: '更新时间', cellRender: ({ row }) => formatDate(row.department.updated_at) },
      { label: '操作', align: 'right', width: 320 + (canManageLeaders ? 120 : 0) + (canManagePositions ? 110 : 0), cellRender: ({ row: { department } }) => <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => onCreate(department)}><Plus aria-hidden="true" />子部门</Button>
        {canManageLeaders && <Button variant="ghost" size="sm" disabled={loading || !department.id} onClick={() => onLeaders(department)}><UserRoundCog aria-hidden="true" />设置负责人</Button>}
        {canManagePositions && <Button variant="ghost" size="sm" disabled={loading || !department.id} onClick={() => onPositions(department)}><BriefcaseBusiness aria-hidden="true" />管理岗位</Button>}
        <Button variant="ghost" size="sm" onClick={() => onDetails(department)}><Eye aria-hidden="true" />详情</Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(department)}><Pencil aria-hidden="true" />编辑</Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (department.id) void onDelete([department.id]) }}><Trash2 aria-hidden="true" />删除</Button>
      </div> },
    ]
  }, [rows, selectedIds, collapsedIds, loading, canManageLeaders, canManagePositions, onSelectionChange, onToggle, onCreate, onEdit, onDetails, onLeaders, onPositions, onDelete])
  useEffect(() => { tableRef.current?.setTableColumns(columns) }, [columns])

  return <MaProTable<DepartmentRow>
    ref={tableRef}
    data={rows}
    loading={loading}
    schema={{ tableColumns: columns, searchItems: [{ prop: 'name', label: '部门名称', render: 'Input' }] }}
    options={{
      header: { mainTitle: '部门管理', subTitle: '维护组织树、部门负责人、岗位和部门用户关系。' }, toolbar: true,
      searchOptions: { defaultValue: { name: '' }, foldButtonShow: false },
      onSearchSubmit: form => { onSearch(typeof form.name === 'string' ? form.name.trim() : '') },
      onSearchReset: () => { onSearch(''); toast('筛选条件已重置') },
      tableOptions: {
        rowKey: row => row.department.id ?? `${row.depth}-${row.department.name}`,
        showPagination: true,
        pagination: { ...pagination, pageSizes: [10, 20, 50, 100], hideOnSinglePage: false, disabled: loading },
        className: 'min-w-[1200px]', emptyText: '暂无部门数据',
      },
    }}
    toolbarLeft={<div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={() => onCreate()}><Plus aria-hidden="true" />新增部门</Button>
      <Button variant="destructive" size="sm" disabled={!selectedIds.length || loading} onClick={() => void onDelete(selectedIds)}><Trash2 aria-hidden="true" />批量删除</Button>
      <span className="text-sm text-muted-foreground">共 {total} 个部门 · 按顶级部门分页</span>
      <Button variant="ghost" size="sm" onClick={onToggleAll}>{collapsedIds.length ? '展开全部' : '折叠全部'}</Button>
    </div>}
    toolbarRight={<Button variant="outline" size="sm" disabled={loading} onClick={onRefresh}><RefreshCw aria-hidden="true" />刷新</Button>}
    empty={error ? <span role="alert" className="text-destructive">{error}</span> : undefined}
  />
}
