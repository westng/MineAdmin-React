import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableColumns, type MaProTableExpose } from '@/components/ma-pro-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/common/use-toast'
import { page, type RoleVo } from '../../api/role'

interface Props {
  tableRef: RefObject<MaProTableExpose<RoleVo> | null>
  selectedIds: number[]
  onSelectionChange: (rows: RoleVo[]) => void
  onCreate: () => void
  onEdit: (row: RoleVo) => void
  onPermissions: (row: RoleVo) => Promise<void>
  onDelete: (ids: number[]) => Promise<void>
}

export default function RoleProTable({ tableRef, selectedIds, onSelectionChange, onCreate, onEdit, onPermissions, onDelete }: Props) {
  const { toast } = useToast()
  const columns = useMemo<MaProTableColumns<RoleVo>[]>(() => [
    { type: 'selection', width: 44 },
    { prop: 'name', label: '角色名称' },
    { prop: 'code', label: '角色编码' },
    { prop: 'sort', label: '排序', width: 80 },
    { prop: 'status', label: '状态', cellRender: ({ row }) => <Badge variant={row.status === 1 ? 'default' : 'secondary'}>{row.status === 1 ? '启用' : row.status === 2 ? '禁用' : '未知'}</Badge> },
    { prop: 'remark', label: '备注' },
    { label: '操作', align: 'right', width: 240, cellRender: ({ row }) => <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => void onPermissions(row)}><KeyRound aria-hidden="true" />权限</Button>
      <Button variant="ghost" size="sm" onClick={() => onEdit(row)}><Pencil aria-hidden="true" />编辑</Button>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={row.code === 'SuperAdmin'} onClick={() => void onDelete(row.id ? [row.id] : [])}>删除</Button>
    </div> },
  ], [onDelete, onEdit, onPermissions])

  useEffect(() => { tableRef.current?.setTableColumns(columns) }, [columns, tableRef])

  const request = useCallback(async (params: Record<string, unknown>) => {
    tableRef.current?.getTableRef()?.clearSelection()
    const response = await page({
      page: Number(params.page ?? 1), page_size: Number(params.page_size ?? 20),
      name: typeof params.name === 'string' ? params.name.trim() : undefined,
      code: typeof params.code === 'string' ? params.code.trim() : undefined,
      status: params.status ? Number(params.status) : undefined,
    })
    if (response.data.code !== 200) throw new Error(response.data.message || '角色列表加载失败')
    return response
  }, [tableRef])

  return <MaProTable<RoleVo>
    ref={tableRef}
    schema={{ tableColumns: columns, searchItems: [
      { prop: 'name', label: '角色名称', render: 'Input' },
      { prop: 'code', label: '角色编码', render: 'Input' },
      { prop: 'status', label: '状态', render: 'Select', renderProps: { options: [{ label: '启用', value: '1' }, { label: '禁用', value: '2' }] } },
    ] }}
    options={{
      header: { mainTitle: '角色管理', subTitle: '维护角色编码并配置菜单权限。' },
      toolbar: true,
      searchOptions: { defaultValue: { name: '', code: '', status: '' }, foldButtonShow: false },
      onSearchReset: () => { toast('筛选条件已重置') },
      requestOptions: { api: request, requestPage: { size: 20 } },
      tableOptions: { rowKey: 'id', className: 'min-w-[900px]', emptyText: '暂无角色数据' },
    }}
    toolbarLeft={<div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" onClick={onCreate}><Plus aria-hidden="true" />新增角色</Button><Button variant="destructive" size="sm" disabled={!selectedIds.length} onClick={() => void onDelete(selectedIds)}><Trash2 aria-hidden="true" />批量删除</Button></div>}
    onSelectionChange={onSelectionChange}
  />
}
