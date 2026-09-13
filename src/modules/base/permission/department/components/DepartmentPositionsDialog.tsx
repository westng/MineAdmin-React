import { useCallback, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { MaProTable } from '@/components/ma-pro-table'
import { useToast } from '@/components/common/use-toast'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { PositionVo } from '../api/position'
import { useDepartmentPositions } from '../hooks/use-department-positions'
import { getPositionTableColumns } from './data/getTableColumns'

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentPositionsDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const { tableRef, request, busy, form, setForm, canCreate, canEdit, canDelete, savePosition, removePosition, pendingDelete, setPendingDelete, confirmRemovePosition } = useDepartmentPositions(departmentId, onChanged)
  const { toast } = useToast()
  const editPosition = useCallback((row: PositionVo) => { if (!busy) setForm({ id: row.id, name: row.name || '' }) }, [busy, setForm])
  const columns = useMemo(() => getPositionTableColumns({ canEdit, canDelete, busy, onEdit: editPosition, onDelete: row => void removePosition(row) }), [busy, canDelete, canEdit, editPosition, removePosition])
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
      <ConfirmDialog open={Boolean(pendingDelete)} title="删除岗位" description={`确认删除当前部门的岗位“${pendingDelete?.name || pendingDelete?.id || ''}”吗？`} onClose={() => setPendingDelete(null)} onConfirm={confirmRemovePosition} />
    </DialogContent>
  </Dialog>
}
