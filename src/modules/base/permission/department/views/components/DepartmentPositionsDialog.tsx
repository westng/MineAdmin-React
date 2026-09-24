import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useCallback, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { MaProTable } from '@/components/ma-pro-table'
import { useToast } from '@/components/reui/use-toast'
import { ConfirmDialog } from '@/components/reui/confirm-dialog'
import { Button } from '@/components/reui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/reui/primitives/dialog'
import { Field, FieldLabel } from '@/components/reui/primitives/field'
import { Input } from '@/components/reui/primitives/input'
import type { PositionVo } from '../../api/position'
import { useDepartmentPositions } from '../../hooks/use-department-positions'
import { getPositionTableColumns } from '../data/related-table-columns'

const tx = createTextTranslator('base.permission.department.ui')

interface Props {
  departmentId: number
  departmentName: string
  onClose: () => void
  onChanged: () => Promise<void>
}

export function DepartmentPositionsDialog({ departmentId, departmentName, onClose, onChanged }: Props) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const {
    tableRef,
    request,
    busy,
    form,
    setForm,
    canCreate,
    canEdit,
    canDelete,
    savePosition,
    removePosition,
    pendingDelete,
    setPendingDelete,
    confirmRemovePosition,
  } = useDepartmentPositions(departmentId, onChanged)
  const { toast } = useToast()
  const editPosition = useCallback(
    (row: PositionVo) => {
      if (!busy) setForm({ id: row.id, name: row.name || '' })
    },
    [busy, setForm],
  )
  const columns = useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return getPositionTableColumns({
      canEdit,
      canDelete,
      busy,
      onEdit: editPosition,
      onDelete: row => void removePosition(row),
    })
  }, [busy, canDelete, canEdit, editPosition, removePosition, localeRevision])
  useEffect(() => {
    tableRef.current?.setTableColumns(columns)
  }, [columns, tableRef])

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{tx('管理岗位')}</DialogTitle>
          <DialogDescription>
            {tx('维护“')}
            {departmentName}
            {tx('”的岗位，新增、编辑和删除后立即生效。')}
          </DialogDescription>
        </DialogHeader>
        {form && (
          <form
            className="space-y-3 rounded-lg border p-4"
            onSubmit={event => {
              event.preventDefault()
              void savePosition()
            }}
          >
            <p className="font-medium">{form.id ? tx('编辑岗位') : tx('新增岗位')}</p>
            <Field>
              <FieldLabel htmlFor={`position-name-${departmentId}`}>{tx('岗位名称')}</FieldLabel>
              <Input
                id={`position-name-${departmentId}`}
                value={form.name}
                maxLength={50}
                disabled={busy}
                onChange={event => setForm({ ...form, name: event.target.value })}
                placeholder={tx('请输入岗位名称')}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setForm(null)}>
                {tx('取消')}
              </Button>
              <Button type="submit" disabled={busy || (form.id ? !canEdit : !canCreate)}>
                {busy ? tx('保存中…') : tx('保存岗位')}
              </Button>
            </div>
          </form>
        )}
        <MaProTable<PositionVo>
          ref={tableRef}
          schema={{ tableColumns: columns, searchItems: [{ prop: 'name', label: tx('岗位名称'), render: 'Input' }] }}
          options={{
            toolbar: true,
            searchOptions: { defaultValue: { name: '' }, foldButtonShow: false },
            onSearchReset: () => {
              toast(tx('筛选条件已重置'))
            },
            requestOptions: { api: request, requestPage: { size: 10 } },
            tableOptions: { rowKey: 'id', emptyText: tx('暂无符合条件的部门岗位') },
          }}
          toolbarLeft={
            canCreate && (
              <Button size="sm" disabled={busy || form !== null} onClick={() => setForm({ name: '' })}>
                <Plus aria-hidden="true" />
                {tx('新增岗位')}
              </Button>
            )
          }
        />
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {tx('关闭')}
          </Button>
        </DialogFooter>
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title={tx('删除岗位')}
          description={tx('确认删除当前部门的岗位“{0}”吗？', { '0': pendingDelete?.name || pendingDelete?.id || '' })}
          onClose={() => setPendingDelete(null)}
          onConfirm={confirmRemovePosition}
        />
      </DialogContent>
    </Dialog>
  )
}
