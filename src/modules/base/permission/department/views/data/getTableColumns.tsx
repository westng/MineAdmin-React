import { createTextTranslator } from '@/provider/i18n'
import { hasAuth } from '@/hooks/framework/use-permission'
import { BriefcaseBusiness, ChevronRight, Eye, Pencil, Plus, Trash2, UserRoundCog } from 'lucide-react'
import type { MaProTableColumns, MaProTableOperationAction } from '@/components/ma-pro-table'
import { Badge } from '@/components/reui/primitives/badge'
import { Button } from '@/components/reui/primitives/button'
import { Checkbox } from '@/components/reui/primitives/checkbox'
import type { DepartmentVo } from '../../api/department'
import type { DepartmentRow } from './department-tree'

const tx = createTextTranslator('base.permission.department.ui')

interface DepartmentColumnActions {
  rows: DepartmentRow[]
  selectedIds: number[]
  collapsedIds: number[]
  loading: boolean
  canManageLeaders: boolean
  canManagePositions: boolean
  onSelectionChange: (ids: number[]) => void
  onToggle: (id: number) => void
  onCreate: (parent?: DepartmentVo) => void
  onEdit: (row: DepartmentVo) => void
  onDetails: (row: DepartmentVo) => void
  onLeaders: (row: DepartmentVo) => void
  onPositions: (row: DepartmentVo) => void
  onDelete: (ids: number[]) => Promise<void>
}

function relationCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}
function formatDate(value: string | null | undefined) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

export function getDepartmentTableColumns({
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
}: DepartmentColumnActions): MaProTableColumns<DepartmentRow>[] {
  const selectableIds = rows.flatMap(row => (row.department.id ? [row.department.id] : []))
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id))
  const actions: MaProTableOperationAction<DepartmentRow>[] = [
    {
      name: 'create-child',
      show: () => hasAuth('permission:department:save'),
      text: tx('子部门'),
      icon: <Plus aria-hidden="true" />,
      onClick: ({ row }) => onCreate(row.department),
    },
    {
      name: 'leaders',
      text: tx('设置负责人'),
      icon: <UserRoundCog aria-hidden="true" />,
      show: () => canManageLeaders,
      disabled: ({ row }) => loading || !row.department.id,
      onClick: ({ row }) => onLeaders(row.department),
    },
    {
      name: 'positions',
      text: tx('管理岗位'),
      icon: <BriefcaseBusiness aria-hidden="true" />,
      show: () => canManagePositions,
      disabled: ({ row }) => loading || !row.department.id,
      onClick: ({ row }) => onPositions(row.department),
    },
    {
      name: 'details',
      text: tx('详情'),
      icon: <Eye aria-hidden="true" />,
      onClick: ({ row }) => onDetails(row.department),
    },
    {
      name: 'edit',
      show: () => hasAuth('permission:department:update'),
      text: tx('编辑'),
      icon: <Pencil aria-hidden="true" />,
      onClick: ({ row }) => onEdit(row.department),
    },
    {
      name: 'delete',
      show: () => hasAuth('permission:department:delete'),
      text: tx('删除'),
      icon: <Trash2 aria-hidden="true" />,
      variant: 'destructive',
      onClick: ({ row }) => {
        if (row.department.id) void onDelete([row.department.id])
      },
    },
  ]
  return [
    {
      width: 44,
      label: '',
      headerRender: () => (
        <Checkbox
          checked={allSelected}
          indeterminate={!allSelected && selectableIds.some(id => selectedIds.includes(id))}
          disabled={loading || !selectableIds.length}
          onCheckedChange={checked => onSelectionChange(checked ? selectableIds : [])}
          aria-label={tx('选择本页部门')}
        />
      ),
      cellRender: ({ row: { department } }) => (
        <Checkbox
          checked={Boolean(department.id && selectedIds.includes(department.id))}
          disabled={loading || !department.id}
          onCheckedChange={checked => {
            if (department.id)
              onSelectionChange(
                checked ? [...selectedIds, department.id] : selectedIds.filter(id => id !== department.id),
              )
          }}
          aria-label={tx('选择 {0}', { '0': department.name || '部门' })}
        />
      ),
    },
    {
      label: tx('部门名称'),
      width: 280,
      cellRender: ({ row: { department, depth } }) => {
        const collapsed = Boolean(department.id && collapsedIds.includes(department.id))
        return (
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>
            {department.children?.length ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-expanded={!collapsed}
                aria-label={collapsed ? tx('展开子部门') : tx('折叠子部门')}
                onClick={() => {
                  if (department.id) onToggle(department.id)
                }}
              >
                <ChevronRight className={`size-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
              </Button>
            ) : (
              <span className="inline-block size-6" />
            )}
            <span className="font-medium">{department.name || '-'}</span>
            {depth === 0 && (
              <Badge variant="outline" className="ml-1">
                {tx('根部门')}
              </Badge>
            )}
          </div>
        )
      },
    },
    { label: tx('负责人'), cellRender: ({ row }) => relationCount(row.department.leader) },
    { label: tx('岗位'), cellRender: ({ row }) => relationCount(row.department.positions) },
    { label: tx('用户'), cellRender: ({ row }) => relationCount(row.department.department_users) },
    { label: tx('创建时间'), cellRender: ({ row }) => formatDate(row.department.created_at) },
    { label: tx('更新时间'), cellRender: ({ row }) => formatDate(row.department.updated_at) },
    {
      type: 'operation',
      label: tx('操作'),
      align: 'right',
      width: 320 + (canManageLeaders ? 120 : 0) + (canManagePositions ? 110 : 0),
      operationConfigure: { type: 'auto', actions },
    },
  ]
}
