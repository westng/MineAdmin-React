import { useEffect, useMemo } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { MaProTable, type MaProTableColumns } from '@/components/ma-pro-table'
import { useToast } from '@/components/common/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { PositionVo } from '../api/position'
import { useDepartmentPositions } from '../hooks/use-department-positions'

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentPositionsDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const { tableRef, request, busy, form, setForm, canCreate, canEdit, canDelete, savePosition, removePosition } = useDepartmentPositions(departmentId, onChanged)
  const { toast } = useToast()
  const columns = useMemo<MaProTableColumns<PositionVo>[]>(() => [
    { prop: 'name', label: '岗位名称' },
    ...(canEdit || canDelete ? [{ label: '操作', align: 'right' as const, width: 170, cellRender: ({ row }: { row: PositionVo }) => <div className="flex justify-end gap-1">
      {canEdit && <Button variant="ghost" size="sm" disabled={busy || !row.id} onClick={() => {
        if (!tableRef.current?.getElTableStates().loading) setForm({ id: row.id, name: row.name || '' })
      }}><Pencil aria-hidden="true" />编辑</Button>}
      {canDelete && <Button variant="ghost" size="sm" className="text-destructive" disabled={busy || !row.id} onClick={() => void removePosition(row)}><Trash2 aria-hidden="true" />删除</Button>}
    </div> }] : []),
  ], [busy, canDelete, canEdit, removePosition, setForm, tableRef])
  useEffect(() => { tableRef.current?.setTableColumns(columns) }, [columns, tableRef])

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
      <DialogHeader>
        <DialogTitle>管理岗位</DialogTitle>
        <DialogDescription>维护“{departmentName}”的岗位，新增、编辑和删除后立即生效。</DialogDescription>
      </DialogHeader>
      {form && <form className="space-y-3 rounded-lg border p-4" onSubmit={event => { event.preventDefault(); void savePosition() }}>
        <p className="font-medium">{form.id ? '编辑岗位' : '新增岗位'}</p>
        <Field>
          <FieldLabel htmlFor={`position-name-${departmentId}`}>岗位名称</FieldLabel>
          <Input id={`position-name-${departmentId}`} value={form.name} maxLength={50} disabled={busy} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="请输入岗位名称" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setForm(null)}>取消</Button>
          <Button type="submit" disabled={busy || (form.id ? !canEdit : !canCreate)}>{busy ? '保存中…' : '保存岗位'}</Button>
        </div>
      </form>}
      <MaProTable<PositionVo>
        ref={tableRef}
        schema={{ tableColumns: columns, searchItems: [{ prop: 'name', label: '岗位名称', render: 'Input' }] }}
        options={{
          toolbar: true,
          searchOptions: { defaultValue: { name: '' }, foldButtonShow: false },
          onSearchReset: () => { toast('筛选条件已重置') },
          requestOptions: { api: request, requestPage: { size: 10 } },
          tableOptions: { rowKey: 'id', emptyText: '暂无符合条件的部门岗位' },
        }}
        toolbarLeft={canCreate && <Button size="sm" disabled={busy || form !== null} onClick={() => setForm({ name: '' })}><Plus aria-hidden="true" />新增岗位</Button>}
      />
      <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>关闭</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
